"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";

const faqs = [
  {
    question: "What is Root Over Education?",
    answer:
      "Root Over Education is a modern learning platform focused on simplifying science and mathematics through structured lessons and clear explanations.",
  },
  {
    question: "How does this platform help learners?",
    answer:
      "We prioritize concept clarity, strong fundamentals, and logical progression to ensure deep understanding and long-term success.",
  },
  {
    question: "Is the learning self-paced?",
    answer:
      "Yes, all lessons are designed for flexible, self-paced learning so you can study anytime at your own comfort.",
  },
  {
    question: "What makes this platform different?",
    answer:
      "Our approach focuses on understanding rather than memorization, using smart modules and expert-designed content.",
  },
  {
    question: "Is expert guidance included?",
    answer:
      "Yes, all content is created and structured by experienced educators to support effective learning.",
  },
];

export default function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section className="py-14 md:py-20 bg-surface overflow-hidden">
      {/* Width Control */}
      <div className="container-custom">
        {/* 6 Column Layout (Desktop) */}
        <div className="flex flex-col lg:flex-row gap-8 lg:gap-16 items-start">
          {/* Left Heading — 2 Columns */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="w-full lg:w-1/3 space-y-3"
          >
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold leading-[1.15] tracking-tight text-foreground">
              Frequently <br className="hidden lg:block" /> Asked Questions
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
              Clear answers to common questions about learning with Root Over
              Education.
            </p>
          </motion.div>

          {/* Right FAQ Cards Column */}
          <div className="w-full lg:w-2/3 space-y-4">
            {faqs.map((faq, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="border border-border bg-card rounded-md overflow-hidden transition-all duration-300 hover:border-primary/30"
              >
                <button
                  onClick={() =>
                    setOpenIndex(openIndex === index ? null : index)
                  }
                  className="w-full flex items-center justify-between px-6 py-5 text-left gap-4"
                >
                  <span className="text-lg md:text-xl font-bold text-foreground">
                    {faq.question}
                  </span>

                  <motion.div
                    animate={{ rotate: openIndex === index ? 180 : 0 }}
                    transition={{ duration: 0.3 }}
                    className="text-primary shrink-0"
                  >
                    <ChevronDown className="h-6 w-6" />
                  </motion.div>
                </button>

                <AnimatePresence>
                  {openIndex === index && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: "easeInOut" }}
                    >
                      <div className="px-6 pb-6 text-muted-foreground leading-relaxed text-[15px] md:text-base border-t border-border/50 pt-4 mt-1">
                        {faq.answer}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}