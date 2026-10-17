import { CtaCard } from "@/components/ui/cta-card";

export default function CtaCardDemo() {
  return (
    <div className="w-full max-w-4xl p-4">
      <CtaCard
        title="Join Us"
        subtitle="Ocean Consulting"
        description="Enrich your expertise and grow your career. The development of both technical and human skills is at the heart of our Group's success."
        buttonText="View Job Openings"
        imageSrc="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=800&q=80"
        imageAlt="A young professional woman in a yellow shirt, holding books and smiling."
        onButtonClick={() => console.log("Navigating to job openings...")}
      />
    </div>
  );
}
