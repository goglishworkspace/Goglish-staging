import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const FAQS = [
  {
    q: "كام جهاز أقدر أسجل دخول بيهم في نفس الوقت؟",
    a: "مسموح بجهازين نشطين بس في نفس الوقت. لو حاولت تدخل من جهاز ثالث هيترفض الدخول، وتقدر تشوف أجهزتك وتلغي أي جهاز من صفحة البروفايل بتاعتك.",
  },
  {
    q: "إيه طرق الدفع المتاحة؟",
    a: "Instapay, Vodafone Cash, فيزا وماستركارد, Paymob, Kasher, و Stripe.",
  },
  {
    q: "لو مش عاجبني الكورس، أقدر أسترجع فلوسي؟",
    a: "أيوه، مسموح بالاسترجاع وفق شروط المنصة، والأدمن هو اللي بيعالج طلبات الاسترجاع.",
  },
  {
    q: "هل ولي الأمر يقدر يتابع أداء ابني؟",
    a: "أيوه، عن طريق بوابة ولي الأمر - يشوف نسبة الإنجاز والدرجات والحضور والترتيب وغيرها، لكن من غير أي تفاعل اجتماعي على المنصة.",
  },
];

export function FaqSection() {
  return (
    <div className="w-full">
      <h2 className="text-h2 text-secondary dark:text-white">الأسئلة الشائعة</h2>

      <Accordion className="mt-6 w-full">
        {FAQS.map((item) => (
          <AccordionItem key={item.q} value={item.q}>
            <AccordionTrigger>{item.q}</AccordionTrigger>
            <AccordionContent>{item.a}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
