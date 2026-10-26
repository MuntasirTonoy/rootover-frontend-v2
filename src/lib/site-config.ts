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
    "Root Over Education is a course marketplace where verified teachers publish complete subject courses and students learn them chapter by chapter, from the fundamental roots of each subject to exam-ready problem solving.",
  bulletPoints: [
    { title: "Verified Teachers", text: "Every teacher is reviewed and verified before they can publish courses." },
    { title: "Complete Subjects", text: "Buy a whole subject once and get every chapter and lesson in it." },
    { title: "Learn Anywhere", text: "Watch lessons on any device, track progress and save lessons to revise later." },
  ] satisfies BulletPoint[],
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
