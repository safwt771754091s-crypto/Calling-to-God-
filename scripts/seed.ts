import "dotenv/config";
import bcrypt from "bcryptjs";
import prisma from "../src/lib/db";

const BIOGRAPHY = [
  { era: "mecca", year: "570 م", titleAr: "المولد", titleEn: "Birth", descriptionAr: "وُلد محمد ﷺ في مكة عام الفيل، بعد وفاة أبيه عبد الله.", descriptionEn: "Muhammad ﷺ was born in Mecca in the Year of the Elephant, after the death of his father Abdullah." },
  { era: "mecca", year: "576 م", titleAr: "اليُتْم والرعاية", titleEn: "Orphanhood", descriptionAr: "تُوفيت أمه آمنة، فكفله جده عبد المطلب ثم عمه أبو طالب.", descriptionEn: "His mother Amina passed away; his grandfather Abd al-Muttalib then his uncle Abu Talib cared for him." },
  { era: "mecca", year: "595 م", titleAr: "الزواج بخديجة", titleEn: "Marriage to Khadija", descriptionAr: "تزوج خديجة بنت خويلد، وكانت أول من آمن به.", descriptionEn: "He married Khadija bint Khuwaylid, who became the first to believe in him." },
  { era: "mecca", year: "610 م", titleAr: "بداية الوحي", titleEn: "First Revelation", descriptionAr: "نزل الوحي في غار حراء، وكانت أولى الآيات: ﴿اقْرَأْ بِاسْمِ رَبِّكَ﴾.", descriptionEn: "The revelation descended in the Cave of Hira, beginning with «Read in the name of your Lord»." },
  { era: "mecca", year: "613 م", titleAr: "الدعوة العلنية", titleEn: "Public Preaching", descriptionAr: "أعلن الدعوة إلى التوحيد، وبدأ أذى قريش للمسلمين.", descriptionEn: "He proclaimed the call to monotheism, and Quraysh began to persecute the Muslims." },
  { era: "mecca", year: "620 م", titleAr: "الإسراء والمعراج", titleEn: "Isra & Mi'raj", descriptionAr: "أُسري به إلى بيت المقدس وعُرج به إلى السماوات، وفُرضت الصلوات الخمس.", descriptionEn: "He was taken to Jerusalem and ascended through the heavens; the five daily prayers were ordained." },
  { era: "medina", year: "622 م", titleAr: "الهجرة إلى المدينة", titleEn: "Hijra to Medina", descriptionAr: "هاجر إلى المدينة، وبدأ التقويم الهجري وبناء المجتمع المسلم.", descriptionEn: "He emigrated to Medina, founding the Muslim community and the Hijri calendar." },
  { era: "medina", year: "624 م", titleAr: "غزوة بدر", titleEn: "Battle of Badr", descriptionAr: "أول معركة كبرى، ونصر فيها المسلمون.", descriptionEn: "The first major battle, in which the Muslims were granted victory." },
  { era: "medina", year: "628 م", titleAr: "صلح الحديبية", titleEn: "Treaty of Hudaybiyyah", descriptionAr: "معاهدة سلام مع قريش مهّدت لفتح مكة.", descriptionEn: "A peace treaty with Quraysh that paved the way for the conquest of Mecca." },
  { era: "medina", year: "630 م", titleAr: "فتح مكة", titleEn: "Conquest of Mecca", descriptionAr: "دخل مكة فاتحًا وأعلن العفو العام وطهّر الكعبة من الأصنام.", descriptionEn: "He entered Mecca as a conqueror, proclaimed a general amnesty and cleansed the Kaaba of idols." },
  { era: "medina", year: "632 م", titleAr: "حجة الوداع والوفاة", titleEn: "Farewell Pilgrimage & Death", descriptionAr: "ألقى خطبة الوداع ثم توفي في المدينة، وقد بلّغ الرسالة وأدّى الأمانة.", descriptionEn: "He delivered the Farewell Sermon and passed away in Medina, having conveyed the message and fulfilled the trust." },
];

const SHAHADA_STEPS = [
  { order: 1, titleAr: "ما هو الإسلام؟", titleEn: "What is Islam?", bodyAr: "الإسلام هو الاستسلام لله وحده بالتوحيد، والانقياد له بالطاعة، والبراءة من الشرك. وهو خاتم الرسالات الخمسة التي بدأت بآدم وانتهت بمحمد ﷺ.", bodyEn: "Islam is submitting to God alone in monotheism, obeying Him, and disavowing polytheism. It is the final of the revealed messages, beginning with Adam and sealed by Muhammad ﷺ." },
  { order: 2, titleAr: "الإيمان بالله", titleEn: "Belief in God", bodyAr: "يؤمن المسلم بأن الله واحد أحد، لا شريك له، خالق كل شيء ومدبره، الرحمن الرحيم.", bodyEn: "A Muslim believes that God is One, unique, without partner, the Creator and Sustainer of all things, Most Merciful and Compassionate." },
  { order: 3, titleAr: "الإيمان بالرسل والكتب", titleEn: "Belief in Prophets and Books", bodyAr: "يؤمن المسلم بجميع الأنبياء والرسل، وبالكتب التي أُنزلت، وأن القرآن هو كلام الله المحفوظ.", bodyEn: "A Muslim believes in all the prophets and messengers, in the revealed books, and that the Quran is the preserved word of God." },
  { order: 4, titleAr: "الشهادتان", titleEn: "The Testimony of Faith", bodyAr: "النطق بالشهادتين: أشهد أن لا إله إلا الله، وأشهد أن محمدًا رسول الله. بها يدخل المرء في الإسلام.", bodyEn: "Pronouncing the testimony: I bear witness that there is no deity worthy of worship except God, and that Muhammad is the Messenger of God. With it one enters Islam.", isRite: true },
  { order: 5, titleAr: "أركان الإسلام", titleEn: "The Pillars of Islam", bodyAr: "الشهادتان، وإقام الصلاة، وإيتاء الزكاة، وصوم رمضان، وحج البيت لمن استطاع.", bodyEn: "The testimony, establishing prayer, giving charity, fasting Ramadan, and pilgrimage to the House for those able." },
  { order: 6, titleAr: "الخطوات التالية والدعم", titleEn: "Next Steps & Support", bodyAr: "بعد الإسلام يُعلَّم المسلم الطهارة والصلاة، ونحن نوفر لك مرشدًا وداعيةً يرافقك خطوة بخطوة.", bodyEn: "After embracing Islam, one learns purification and prayer; we provide a mentor and a caller to Islam to guide you step by step." },
];

const CATEGORIES = [
  { slug: "about-islam", nameAr: "التعريف بالإسلام", nameEn: "About Islam" },
  { slug: "quran", nameAr: "القرآن الكريم", nameEn: "The Quran" },
  { slug: "prophet", nameAr: "النبي محمد ﷺ", nameEn: "The Prophet Muhammad ﷺ" },
  { slug: "practices", nameAr: "العبادات", nameEn: "Worship & Practices" },
  { slug: "women-islam", nameAr: "المرأة في الإسلام", nameEn: "Women in Islam" },
  { slug: "new-muslim", nameAr: "المهتدون الجدد", nameEn: "New Muslims" },
  { slug: "comparative", nameAr: "مقارنة الأديان", nameEn: "Comparative Religion" },
];

const QUESTIONS = [
  {
    slug: "about-islam",
    locale: "en",
    body: "What does the word Islam mean, and who is a Muslim?",
    answerEn:
      "Islam means peaceful submission to God alone. A Muslim is anyone who testifies that there is no deity worthy of worship except God and that Muhammad is His Messenger. It is not a new religion but the same monotheism taught by Abraham and all the prophets.",
    answerAr:
      "الإسلام هو الاستسلام لله وحده، والمسلم من يشهد أن لا إله إلا الله وأن محمدًا رسول الله. وهو ليس دينًا جديدًا بل هو التوحيد الذي جاء به إبراهيم وسائر الأنبياء.",
  },
  {
    slug: "quran",
    locale: "en",
    body: "Is the Quran preserved in its original form?",
    answerEn:
      "Yes. The Quran has been transmitted continuously by mass memorisation and written codices since the Prophet's time. Millions today have memorised it in full, and all known manuscripts agree letter for letter.",
    answerAr:
      "نعم. نُقل القرآن نقلًا متواترًا بالحفظ والكتابة منذ عهد النبي ﷺ، ويحفظه اليوم الملايين عن ظهر قلب، والمخطوطات المعروفة متفقة حرفًا حرفًا.",
  },
  {
    slug: "women-islam",
    locale: "en",
    body: "Do women have rights in Islam?",
    answerEn:
      "Islam grants women the right to own property, to inherit, to seek education, to choose their spouse, and to earn their own wealth — rights affirmed in the Quran fourteen centuries ago.",
    answerAr:
      "قرّر الإسلام للمرأة حق التملك، والإرث، وطلب العلم، واختيار الزوج، والكسب — حقوق أثبتها القرآن قبل أربعة عشر قرنًا.",
  },
  {
    slug: "new-muslim",
    locale: "en",
    body: "I want to embrace Islam. What should I do first?",
    answerEn:
      "Begin by sincerely pronouncing the testimony of faith (Shahada). Then learn prayers and purification step by step — our 'Path to Islam' guide accompanies you, and you may contact a caller to Islam for personal support.",
    answerAr:
      "ابدأ بالنطق بالشهادتين بإخلاص، ثم تعلّم الطهارة والصلاة تدريجيًا. دليل «مسار الإسلام» يرافقك، ويمكنك التواصل مع داعية للحصول على دعم شخصي.",
  },
];

async function main() {
  console.log("→ Staff users…");
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@trupath.local";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "admin12345";
  const passwordHash = await bcrypt.hash(adminPassword, 10);
  await prisma.user.upsert({
    where: { email: adminEmail },
    create: { name: "Platform Admin", email: adminEmail, passwordHash, role: "ADMIN" },
    update: { passwordHash, role: "ADMIN" },
  });
  await prisma.user.upsert({
    where: { email: "scholar@trupath.local" },
    create: { name: "Dawah Supervisor", email: "scholar@trupath.local", passwordHash, role: "SCHOLAR" },
    update: { role: "SCHOLAR" },
  });

  console.log("→ Biography events…");
  await prisma.biographyEvent.deleteMany({});
  await prisma.biographyEvent.createMany({
    data: BIOGRAPHY.map((b, i) => ({ ...b, order: i + 1 })),
  });

  console.log("→ Shahada track…");
  await prisma.shahadaStep.deleteMany({});
  await prisma.shahadaStep.createMany({ data: SHAHADA_STEPS });

  console.log("→ Q&A categories…");
  const catId = new Map<string, number>();
  for (const c of CATEGORIES) {
    const row = await prisma.qaCategory.upsert({
      where: { slug: c.slug },
      create: c,
      update: { nameAr: c.nameAr, nameEn: c.nameEn },
    });
    catId.set(c.slug, row.id);
  }

  console.log("→ Sample published answers…");
  for (const q of QUESTIONS) {
    const existing = await prisma.question.findFirst({ where: { body: q.body } });
    if (existing) {
      await prisma.question.update({
        where: { id: existing.id },
        data: {
          status: "PUBLISHED",
          answerEn: q.answerEn,
          answerAr: q.answerAr,
          categoryId: catId.get(q.slug) ?? null,
          aiProvider: "seed",
          aiModel: "seed",
          aiConfidence: 1,
        },
      });
    } else {
      await prisma.question.create({
        data: {
          locale: q.locale,
          body: q.body,
          status: "PUBLISHED",
          answerEn: q.answerEn,
          answerAr: q.answerAr,
          categoryId: catId.get(q.slug) ?? null,
          aiProvider: "seed",
          aiModel: "seed",
          aiConfidence: 1,
        },
      });
    }
  }

  console.log("→ Platform config…");
  const config: Record<string, string> = {
    "platform.name": "The True Path Islam",
    "platform.name.ar": "الصراط المستقيم",
    "platform.tagline": "Inviting to Islam with knowledge and compassion",
    "owner.name": process.env.SEED_OWNER_NAME ?? "Platform Owner",
  };
  for (const [key, value] of Object.entries(config)) {
    await prisma.platformConfig.upsert({ where: { key }, create: { key, value }, update: { value } });
  }

  console.log(`✔ Seed complete. Admin: ${adminEmail} / ${adminPassword}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
