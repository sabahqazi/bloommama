import React, { useState, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { Dialog, DialogContent, DialogClose, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { trackCTAClick } from '../services/analytics';
import { supabase } from "@/integrations/supabase/client";

const Hero = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showOverlay, setShowOverlay] = useState(false);
  const [answer, setAnswer] = useState('');
  const [showAnswer, setShowAnswer] = useState(false);
  const [heroCtaClicks, setHeroCtaClicks] = useState(0);
  const pills = ["I had a vaginal birth. Why do I still look pregnant even after 3 weeks?", "How do I know if my baby is getting enough milk?", "When will my postpartum bleeding stop?", "I had a C-section. When can I start exercising again after giving birth?", "Is it normal for my baby to wake up every 2 hours?"];

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowOverlay(true);
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  const handlePillClick = (pill: string) => {
    setSearchQuery(pill);
    handleSearch(pill);
  };

  const handleSearch = async (query: string = searchQuery) => {
    const queryToUse = query || searchQuery;
    
    if (queryToUse.trim() === "") {
      setShowAnswer(false);
      return;
    }

    setAnswer("Getting answer from Bloom Mama AI...");
    setShowAnswer(true);

    try {
      console.log('Calling RAG edge function with question:', queryToUse);
      
      const { data, error } = await supabase.functions.invoke('rag-answer', {
        body: { question: queryToUse }
      });

      console.log('RAG edge function response:', { data, error });

      if (error) {
        console.error('Edge function error:', error);
        setAnswer("I'm having trouble connecting right now. Please try again in a moment or join our waitlist for priority access!");
        return;
      }

      if (data?.answer) {
        let response = `bloom mama's answer: ${data.answer}`;
        if (data.sources && data.sources.length > 0) {
          response += `\n\n📚 Sources: ${data.sources.join(', ')}`;
        }
        response += `\n\nWant personalized support 24/7? Join our waitlist today!`;
        setAnswer(response);
      } else {
        setAnswer("I'm having trouble connecting right now. Please try again in a moment or join our waitlist for priority access!");
      }
    } catch (error) {
      console.error('Error:', error);
      setAnswer("I'm having trouble connecting right now. Please try again in a moment or join our waitlist for priority access!");
    }
  };

  const trackHeroCtaClick = (ctaName: string) => {
    const clickCount = trackCTAClick('home', ctaName, 'hero-section');
    setHeroCtaClicks(clickCount);
  };

  return <section className="min-h-screen pt-20 pb-8 relative overflow-hidden bg-[#f8fafc] flex items-center">
      <div className="container relative z-10">
        <div className="max-w-4xl mx-auto text-center mb-5">
          <div className="mb-6 inline-block">
            <span className="bg-pink-100 text-pink-600 px-4 rounded-full text-sm font-medium py-[8px]">
              Early Access Coming Soon
            </span>
          </div>
          
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-3 text-gray-900 text-center">
            Endless questions in Motherhood?<br />
            We've got you!
          </h1>
            
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-4 text-gray-900 text-center leading-tight">
            <span className="text-gray-900">Personalized AI partner that adapts to <span className="text-pink-600">your</span> unique</span><br />
            <span className="text-pink-600">postpartum</span> journey
          </h2>
        </div>
        
        <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-lg p-5 md:p-6">
          <div className="text-center mb-4">
            <h3 className="text-lg font-medium text-gray-800">
              Ask me anything about <span className="text-pink-600">your</span> postpartum experience, 
              <span className="text-pink-600"> your</span> self-care needs, or <span className="text-pink-600"> your</span> baby's health —
              get answers as to <span className="text-pink-600">your</span> motherhood journey!
            </h3>
          </div>
          
          <div className="flex flex-col items-center mb-4 space-y-2">
            <div className="flex flex-wrap gap-2 justify-center">
              {pills.slice(0, 2).map((pill, index) => <Badge key={index} className="cursor-pointer text-xs py-1.5 px-3 whitespace-normal text-left bg-blue-100 hover:bg-blue-200 text-blue-800" variant="outline" onClick={() => handlePillClick(pill)}>
                  {pill}
                </Badge>)}
            </div>
            
            <div className="flex flex-wrap gap-2 justify-center">
              {pills.slice(2, 5).map((pill, index) => <Badge key={index + 2} className="cursor-pointer text-xs py-1.5 px-3 whitespace-normal text-left bg-blue-100 hover:bg-blue-200 text-blue-800" variant="outline" onClick={() => handlePillClick(pill)}>
                  {pill}
                </Badge>)}
            </div>
          </div>
          
          <div className="relative mb-4">
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input type="text" className="pl-10 pr-12 py-3 w-full border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-200 font-['Open_Sans']" placeholder="Example: &quot;Why is my c-section scar still painful after 4 weeks OR what sleeping pattern is normal for my 6-week-old &quot;" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearch()} />
            <button className="absolute inset-y-0 right-3 flex items-center" onClick={() => handleSearch()}>
              <div className="bg-pink-100 p-2 rounded-full">
                <Search className="h-4 w-4 text-pink-500" />
              </div>
            </button>
          </div>
          
            {showAnswer && <div className="mb-4 text-gray-800 px-4 py-3 rounded-lg bg-pink-50 border border-pink-100">
              <p className="text-sm whitespace-pre-line">
                {answer.startsWith("bloom mama's answer:") ? (
                  <>
                    <em className="font-medium text-pink-700 block mb-1">bloom mama's answer:</em>
                    <span className="text-gray-700">{answer.substring(answer.indexOf(":") + 1).trim()}</span>
                  </>
                ) : (
                  answer
                )}
              </p>
            </div>}
          
          <div className="text-center">
            <p className="text-gray-700 mb-3 font-['Open_Sans']">Want this experience? Join our waitlist today</p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <a href="#waitlist" className="bg-pink-100 hover:bg-pink-200 text-pink-700 px-6 py-3 rounded-lg font-medium transition-colors font-['Open_Sans']" onClick={() => trackHeroCtaClick('join-waitlist')}>
                Join Waitlist
              </a>
              <a href="#features" className="bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 px-6 py-3 rounded-lg font-medium transition-colors font-['Open_Sans']" onClick={() => trackCTAClick('home', 'see-features', 'hero-section')}>
                See Features
              </a>
            </div>
            
            {import.meta.env.DEV && heroCtaClicks > 0 && <div className="mt-2 text-xs text-blue-500">
                Hero CTA Clicks: {heroCtaClicks}
              </div>}
          </div>
        </div>
      </div>

      <Dialog open={showOverlay} onOpenChange={setShowOverlay}>
        <DialogContent className="bg-[#E8F4FF] border-none p-6 max-w-md mx-auto rounded-xl">
          <DialogTitle className="sr-only">Welcome Message</DialogTitle>
          
          <div className="flex flex-col items-center text-center">
            <div className="mb-4 w-60 mx-auto">
              <img src="/lovable-uploads/79afbdd8-32c1-4b06-bca9-c21961dc1e30.png" alt="Mother and baby whale illustration" className="w-full" />
            </div>
            
            <h2 className="font-['Comfortaa'] text-3xl font-bold text-[#E04D60] mb-4">
              Hi Mama, glad to see you here!
            </h2>
            
            <p className="text-black text-lg mb-2 font-['Open_Sans']">
              <span className="text-inherit">Your</span> postpartum journey is personal to you! I'm here for you 24/7. You don't have to face this journey alone!
            </p>
            
            <a href="#" onClick={e => {
            e.preventDefault();
            setShowOverlay(false);
          }} className="bg-[#E04D60] hover:bg-[#d03c50] text-white font-bold px-8 rounded-lg transition-colors font-['Comfortaa'] py-[8px] mt-2">
              try bloom
            </a>
          </div>
        </DialogContent>
      </Dialog>
    </section>;
};

export default Hero;
