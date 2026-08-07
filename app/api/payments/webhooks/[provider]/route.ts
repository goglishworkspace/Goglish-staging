import { NextRequest, NextResponse } from "next/server";
import { getPaymentProvider, isPaymentProviderName } from "@/lib/payments";
import {
  recordWebhookEvent,
  fulfillPaymentEvent,
  recordWebhookFailure,
} from "@/lib/services/webhook-processing.service";

/** One dynamic route for every gateway (Section 9 - Webhook Handler). Always
 * reads the RAW body first - signature verification needs the exact bytes
 * the provider signed, not a re-serialized JSON.parse() round-trip. */
export async function POST(request: NextRequest, { params }: { params: Promise<{ provider: string }> }) {
  const { provider: providerParam } = await params;
  if (!isPaymentProviderName(providerParam)) {
    return NextResponse.json({ error: "unknown provider" }, { status: 404 });
  }

  const provider = getPaymentProvider(providerParam);
  if (!provider) return NextResponse.json({ error: "unknown provider" }, { status: 404 });
  const rawBody = await request.text();

  if (!provider.verifyWebhookSignature(rawBody, request.headers)) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  const parsedEvent = provider.parseWebhookEvent(rawBody);
  if (!parsedEvent) {
    // Recognized signature, but not an event type we act on - acknowledge
    // so the provider stops retrying it.
    return NextResponse.json({ ok: true });
  }

  const eventRow = await recordWebhookEvent({
    provider: providerParam,
    eventId: parsedEvent.eventId,
    providerPaymentId: parsedEvent.providerPaymentId,
    status: parsedEvent.status,
    payload: JSON.parse(rawBody),
  });

  if (eventRow.processed) {
    return NextResponse.json({ ok: true, alreadyProcessed: true });
  }

  try {
    await fulfillPaymentEvent({
      eventRowId: eventRow.id,
      provider: providerParam,
      providerPaymentId: parsedEvent.providerPaymentId,
      status: parsedEvent.status,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(`webhook processing failed for ${providerParam}:${parsedEvent.eventId}`, error);
    await recordWebhookFailure(eventRow.id);
    // 500 so the provider's own webhook retry mechanism also kicks in - the
    // hourly reconciliation job is a backstop, not the primary retry path.
    return NextResponse.json({ error: "processing failed" }, { status: 500 });
  }
}
