'use client';

import Star from 'lucide-react/dist/esm/icons/star';

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
    <section className="py-20 lg:py-32 bg-white dark:bg-slate-900">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="font-display text-4xl lg:text-5xl font-bold text-slate-900 dark:text-slate-100 mb-6">
            Loved by style enthusiasts
          </h2>
          <p className="text-xl text-slate-600 dark:text-slate-400 max-w-3xl mx-auto">
            Join thousands who've transformed their daily outfit selection.
          </p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
          {testimonials.map((testimonial, index) => (
            <div 
              key={testimonial.author}
              className="bg-gradient-to-br from-slate-50 to-stone-50 rounded-3xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 animate-slide-up"
              style={{ animationDelay: `${index * 0.2}s` }}
            >
              {/* Rating */}
              <div className="flex items-center gap-1 mb-6">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 text-amber-500 fill-current" />
                ))}
              </div>
              
              {/* Quote */}
              <blockquote className="text-lg text-slate-700 leading-relaxed mb-6 font-medium">
                &ldquo;{testimonial.quote}&rdquo;
              </blockquote>
              
              {/* Author */}
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-700 rounded-full flex items-center justify-center text-white font-semibold">
                  {testimonial.avatar}
                </div>
                <div>
                  <div className="font-semibold text-slate-900">{testimonial.author}</div>
                  <div className="text-sm text-slate-600">{testimonial.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}