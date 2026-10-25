// Static site content for the marketing pages
import type { BulletPoint, SocialLink } from "./types";

export const banner = {
  title: `Learn Smarter<br/><span class="text-primary">with Root Over Education</span>`,
  subtitle:
    "SSC, HSC, BSc, BBA and BA courses taught by verified teachers. Buy a full course once and learn chapter by chapter.",
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

export const socialLinks: SocialLink[] = [
  { label: "Facebook", url: "https://facebook.com" },
  { label: "YouTube", url: "https://youtube.com" },
];
