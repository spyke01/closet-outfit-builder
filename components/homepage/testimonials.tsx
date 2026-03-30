import { Star } from 'lucide-react';



const testimonials = [
  {
    quote: "It&apos;s like having a stylist in my closet. I save 10 minutes every morning.",
    author: "Alex M.",
    role: "Marketing Manager",
    avatar: "AM",
    rating: 5,
  },
  {
    quote: "I actually started wearing clothes I forgot I owned.",
    author: "Jordan P.",
    role: "Software Engineer", 
    avatar: "JP",
    rating: 5,
  },
  {
    quote: "Simple, smart, and beautiful.",
    author: "Priya L.",
    role: "Creative Director",
    avatar: "PL", 
    rating: 5,
  },
];

export function Testimonials() {
  return (
    <section className="relative py-16 lg:py-24">
      <div className="mx-auto max-w-[1240px] px-6">
        <div className="app-section section-delay-1 mb-12 text-center lg:mb-14">
          <h2 className="font-display mb-6 text-4xl font-normal text-foreground lg:text-5xl">
            Loved by style enthusiasts
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Join thousands who&apos;ve transformed their daily outfit selection.
          </p>
        </div>
        
        <div className="grid gap-6 md:grid-cols-3 lg:gap-8">
          {testimonials.map((testimonial, index) => (
            <div 
              key={testimonial.author}
              className="glass-surface app-section p-6 lg:p-8"
              style={{ animationDelay: `${0.08 + index * 0.08}s` }}
            >
              {/* Rating */}
              <div className="flex items-center gap-1 mb-6">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 text-primary fill-current" />
                ))}
              </div>
              
              {/* Quote */}
              <blockquote className="text-lg text-muted-foreground leading-relaxed mb-6 font-medium">
                &ldquo;{testimonial.quote}&rdquo;
              </blockquote>
              
              {/* Author */}
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--accent-muted)] text-primary font-semibold">
                  {testimonial.avatar}
                </div>
                <div>
                  <div className="font-semibold text-foreground">{testimonial.author}</div>
                  <div className="text-sm text-muted-foreground">{testimonial.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
