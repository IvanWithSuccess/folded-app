import React from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "./ui/accordion";

interface FAQItem {
  question: string;
  answer: string | React.ReactNode;
}

const faqData: FAQItem[] = [
  {
    question: "What is Folded?",
    answer: "Folded is an unofficial Telegram client that transforms your account into a personal cloud drive. It provides a familiar file explorer interface with folders, navigation, search, and deep OS integration.",
  },
  {
    question: "How does the unlimited storage work?",
    answer: "Telegram officially gives every user unlimited personal cloud storage. The only limit is individual file size (up to 2 GB for regular users, 4 GB for Premium subscribers). Folded automatically splits large files into chunks when uploading and merges them back on-the-fly when downloading or streaming.",
  },
  {
    question: "Is Folded secure and private?",
    answer: "Yes. Folded connects directly to Telegram servers via the official MTProto API. There are no middlemen, intermediate servers, trackers, or telemetry. Your authentication sessions and local SQLite metadata cache are stored entirely on your local machine, protected by OS permissions.",
  },
  {
    question: "How does the Virtual Drive integration work?",
    answer: "Folded runs a local WebDAV server bridge that mounts in macOS Finder as a virtual network drive. This lets you open documents, view photos, or edit files directly inside the cloud. Data streams on-the-fly, so you don't need to pre-download files to your local drive.",
  },
  {
    question: "What is Live Backup (Mirroring)?",
    answer: "Mirroring Manager allows you to select directories on your local computer to sync automatically to your Telegram cloud. Since storage is virtually infinite, Folded preserves a history of changes, allowing you to roll back edits or recover deleted files.",
  },
  {
    question: "Can I use multiple Telegram accounts?",
    answer: "Yes, multi-account support is built-in. You can add as many Telegram accounts as you want. Each account is mounted as its own separate network drive, allowing you to manage multiple storage nodes concurrently.",
  },
  {
    question: "What platforms are supported?",
    answer: "Folded is optimized for macOS (macOS 12+, supporting both Apple Silicon and Intel Core processors) with native Finder WebDAV integration. While you can build the core client from source on Windows or Linux, native drive integration is currently limited on non-macOS platforms.",
  },
];

export default function FAQ() {
  return (
    <section className="bg-[#09090b] py-20 px-6 border-t border-white/5 font-['Montserrat',sans-serif]">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Frequently Asked Questions
          </h2>
          <p className="text-base text-gray-400 font-light">
            Everything you need to know about Folded Cloud capacity, security, and OS integration.
          </p>
        </div>

        <Accordion type="single" collapsible className="w-full space-y-4">
          {faqData.map((item, index) => (
            <AccordionItem
              key={index}
              value={`item-${index}`}
              className="border border-white/10 rounded-lg px-6 py-1 bg-white/[0.02] hover:bg-white/[0.04] transition-all duration-200"
            >
              <AccordionTrigger className="text-base md:text-lg font-semibold text-white hover:no-underline py-4">
                {item.question}
              </AccordionTrigger>
              <AccordionContent className="text-sm md:text-base font-normal text-gray-400 leading-relaxed pt-2 pb-6 border-t border-white/5 mt-2">
                {item.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
