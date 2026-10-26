// Static site content for the marketing pages
import type { BulletPoint, SocialLink } from "./types";

export const banner = {
  title: `Learn Smarter<br/><span class="text-primary">with Root Over Education</span>`,
  subtitle:
    "Master Every Subject with Confidence! Learn from trusted teachers, build strong fundamentals, and achieve your academic goals with ease—all on the country’s largest learning platform.",
  logoUrl: "",
};

export const about = {
  title: "About Root Over Education",
  description:
    "Root Over Education is a course marketplace for Bangladesh where verified teachers publish complete subject courses and students learn them chapter by chapter, from the fundamental roots of each subject to exam-ready problem solving.\n\nWe started Root Over because good teaching is hard to find and harder to afford. Instead of scattered videos and one-off classes, every course here covers a whole subject in order, so students always know what to learn next. Courses span SSC, HSC, BSc, BBA and BA, along with skills and languages.",
  bulletPoints: [
    { title: "Verified Teachers", text: "Every teacher is reviewed and verified before they can publish courses." },
    { title: "Reviewed Courses", text: "Our team checks each course before it goes live in the catalog." },
    { title: "Complete Subjects", text: "Buy a whole subject once and get every chapter and lesson in it." },
    { title: "Try Before You Buy", text: "Every course has free preview lessons you can watch without paying." },
    { title: "Learn Anywhere", text: "Watch lessons on any device, track progress and save lessons to revise later." },
    { title: "Notes and Support", text: "Download lesson notes, and report a problem with any video so the teacher can fix it." },
    { title: "Simple Payments", text: "Pay once with bKash and keep access to the course." },
  ] satisfies BulletPoint[],
};

// "How it works" on the About page, one list per side of the marketplace
export const howItWorks = {
  students: [
    { title: "Find a course", text: "Browse by level and subject, or search for a teacher." },
    { title: "Watch a free preview", text: "See how the teacher explains before you decide." },
    { title: "Buy the subject", text: "Pay once with bKash and the whole course unlocks." },
    { title: "Learn and revise", text: "Follow the chapters in order, track progress and rate the course." },
  ],
  teachers: [
    { title: "Apply", text: "Send your details and documents for review." },
    { title: "Get verified", text: "Pay the one-time registration fee once your application is accepted." },
    { title: "Publish courses", text: "Build chapters and lessons from your YouTube videos and submit them for review." },
    { title: "Earn", text: "Earn from every sale and withdraw your balance to bKash." },
  ],
};

export const contact = {
  email: "",
  phone: "01316271902",
  address: "Bangladesh",
};

export const founders = [
  {
    name: "Muntasir Tonoy",
    role: "Co-Founder",
    photo: "https://i.ibb.co.com/KJrpYgY/prof-headshot.jpg",
    portfolio: "https://www.muntasirmahmud.com/",
  },
  {
    name: "Ranok Raihan",
    role: "Co-Founder",
    photo: "https://i.ibb.co.com/BKyLTXXy/821523280-4609476899371154-8111223887945179363-n.jpg",
    portfolio: "https://ranokraihan.com/",
  },
];

export const socialLinks: SocialLink[] = [
  { label: "Facebook", url: "https://facebook.com" },
  { label: "YouTube", url: "https://youtube.com" },
];
