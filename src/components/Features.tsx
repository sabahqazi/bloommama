
import React from 'react';
import { FileCheck, BookOpen, Star, Heart, MessageSquare, Clock } from 'lucide-react';

const Features = () => {
  return (
    <section id="features" className="section bg-white">
      <div className="container text-center">
        <div className="mb-10 inline-block">
          <span 
            id="how-it-works"
            className="bg-pink-100 text-pink-600 px-4 py-2 rounded-full text-sm font-medium transition-all duration-300"
          >
            How it works
          </span>
        </div>
        
        <div className="mb-12">
          <h2 className="text-4xl font-bold mb-6 text-gray-800">
            Your Unique Postpartum Support Platform
          </h2>
          <p className="text-lg text-gray-700 max-w-3xl mx-auto">
            <span className="font-['Comfortaa'] font-bold text-pink-600">Bloom</span> provides comprehensive, personalized support for new mothers, combining advanced technology with compassionate care.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <div className="p-6 bg-gray-50 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 flex items-start">
            <div className="mr-4">
              <MessageSquare size={36} className="text-pink-600" />
            </div>
            <div>
              <h3 className="text-2xl font-semibold mb-4 text-gray-800">
                Personalized Q&A
              </h3>
              <p className="text-gray-600">
                Get answers tailored to your unique situation with our AI-powered Q&A system, designed specifically for new mothers.
              </p>
            </div>
          </div>
          
          <div className="p-6 bg-gray-50 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 flex items-start">
            <div className="mr-4">
              <Clock size={36} className="text-pink-600" />
            </div>
            <div>
              <h3 className="text-2xl font-semibold mb-4 text-gray-800">
                24/7 Support
              </h3>
              <p className="text-gray-600">
                Access help whenever you need it with our round-the-clock support system, ensuring assistance is always just a click away.
              </p>
            </div>
          </div>
          
          <div className="p-6 bg-gray-50 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 flex items-start">
            <div className="mr-4">
              <FileCheck size={36} className="text-pink-600" />
            </div>
            <div>
              <h3 className="text-2xl font-semibold mb-4 text-gray-800">
                Research-Backed Advice
              </h3>
              <p className="text-gray-600">
                Expert-curated guidance grounded in the latest scientific research, ensuring reliable and up-to-date postpartum support.
              </p>
            </div>
          </div>
          
          <div className="p-6 bg-gray-50 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 flex items-start">
            <div className="mr-4">
              <BookOpen size={36} className="text-pink-600" />
            </div>
            <div>
              <h3 className="text-2xl font-semibold mb-4 text-gray-800">
                Resource Library
              </h3>
              <p className="text-gray-600">
                Comprehensive collection of articles, videos, and tools to support your physical and emotional well-being throughout motherhood.
              </p>
            </div>
          </div>
          
          <div className="p-6 bg-gray-50 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 flex items-start">
            <div className="mr-4">
              <Star size={36} className="text-pink-600" />
            </div>
            <div>
              <h3 className="text-2xl font-semibold mb-4 text-gray-800">
                Instant Relief
              </h3>
              <p className="text-gray-600">
                Immediate, personalized support and coping strategies to help you navigate challenges and find quick, practical solutions.
              </p>
            </div>
          </div>
          
          <div className="p-6 bg-gray-50 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 flex items-start">
            <div className="mr-4">
              <Heart size={36} className="text-pink-600" />
            </div>
            <div>
              <h3 className="text-2xl font-semibold mb-4 text-gray-800">
                Mom & Baby Care
              </h3>
              <p className="text-gray-600">
                Holistic support focusing on both maternal and infant health, ensuring comprehensive care and guidance for you and your baby.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Features;
