import React, { useState, useEffect, useRef } from 'react';
import { Send, Mic, MicOff, MapPin, Clock, Star, AlertCircle, Phone, Video, MessageSquare, User, Settings, Loader } from 'lucide-react';

const AgoraHealthBookingAI = () => {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: "Hello! I'm your AI healthcare assistant powered by Agora. How can I help you today? You can speak or type your symptoms." }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [agentStatus, setAgentStatus] = useState('idle');
  const [agentId, setAgentId] = useState(null);
  const [conversationState, setConversationState] = useState({
    patientName: '',
    symptoms: [],
    urgency: 'normal',
    preferredSpecialty: '',
    location: '',
    preferences: {}
  });
  const [showDoctors, setShowDoctors] = useState(false);
  const [filteredDoctors, setFilteredDoctors] = useState([]);
  const [showConfig, setShowConfig] = useState(false);
  const [agoraConfig, setAgoraConfig] = useState({
    appId: '',
    appCertificate: '',
    customerId: '',
    customerSecret: '',
    channelName: 'healthcare-booking',
    userId: Math.floor(Math.random() * 1000000).toString()
  });
  const messagesEndRef = useRef(null);

  const doctors = [
    { id: 1, name: 'Dr. Sarah Johnson', specialty: 'Cardiology', gender: 'Female', rating: 4.8, experience: 15, charges: 1500, location: 'South Delhi', distance: 2.3, availability: ['Today 3:00 PM', 'Today 5:30 PM', 'Tomorrow 10:00 AM'], urgent: true },
    { id: 2, name: 'Dr. Rajesh Kumar', specialty: 'General Medicine', gender: 'Male', rating: 4.6, experience: 12, charges: 800, location: 'Connaught Place', distance: 4.1, availability: ['Today 2:30 PM', 'Tomorrow 9:00 AM'], urgent: true },
    { id: 3, name: 'Dr. Priya Sharma', specialty: 'Dermatology', gender: 'Female', rating: 4.9, experience: 10, charges: 1200, location: 'Vasant Vihar', distance: 3.5, availability: ['Tomorrow 11:00 AM', 'Tomorrow 4:00 PM'], urgent: false },
    { id: 4, name: 'Dr. Amit Patel', specialty: 'Orthopedics', gender: 'Male', rating: 4.7, experience: 18, charges: 1800, location: 'Greater Kailash', distance: 1.8, availability: ['Today 4:00 PM', 'Tomorrow 10:30 AM'], urgent: true },
    { id: 5, name: 'Dr. Meera Reddy', specialty: 'Pediatrics', gender: 'Female', rating: 4.8, experience: 14, charges: 1000, location: 'Hauz Khas', distance: 5.2, availability: ['Tomorrow 9:30 AM', 'Tomorrow 2:00 PM'], urgent: false },
    { id: 6, name: 'Dr. Vikram Singh', specialty: 'Neurology', gender: 'Male', rating: 4.9, experience: 20, charges: 2000, location: 'Defence Colony', distance: 3.8, availability: ['Today 6:00 PM', 'Tomorrow 11:30 AM'], urgent: true }
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const generateToken = async () => {
    return 'mock-token-' + Date.now();
  };

  const startAgoraAgent = async () => {
    if (!agoraConfig.appId || !agoraConfig.customerId) {
      setMessages(prev => [...prev, {
        role: 'system',
        content: 'Please configure your Agora credentials first. Click the settings icon to add your App ID, Customer ID, and Customer Secret.'
      }]);
      setShowConfig(true);
      return;
    }

    try {
      setAgentStatus('starting');
      setMessages(prev => [...prev, {
        role: 'system',
        content: 'Starting voice AI agent...'
      }]);

      const token = await generateToken();

      const apiUrl = `https://api.agora.io/api/conversational-ai-agent/v2/projects/${agoraConfig.appId}/join`;
      
      const agentConfig = {
        name: `health-agent-${Date.now()}`,
        properties: {
          channel: agoraConfig.channelName,
          token: token,
          agent_rtc_uid: "0",
          remote_rtc_uids: ["*"],
          idle_timeout: 300,
          advanced_features: {
            enable_aivad: true,
            enable_rtm: true
          },
          asr: {
            language: "en-US",
            vendor: "ares",
            params: {}
          },
          tts: {
            vendor: "microsoft",
            params: {
              voice_name: "en-US-AndrewMultilingualNeural",
              rate: 1.0,
              volume: 100.0
            }
          },
          llm: {
            url: "https://api.openai.com/v1/chat/completions",
            api_key: "",
            system_messages: [{
              role: "system",
              content: "You are a compassionate AI healthcare booking assistant. Listen empathetically to patient symptoms, ask clarifying questions, determine urgency level, recommend appropriate medical specialists, collect patient information naturally, suggest suitable doctors, and help book appointments. Be warm, professional, and concise."
            }],
            params: {
              model: "gpt-4",
              temperature: 0.7,
              max_tokens: 500
            },
            max_history: 20,
            input_modalities: ["text"],
            output_modalities: ["text", "audio"],
            greeting_message: "Hello! I'm your AI healthcare assistant. How can I help you today?"
          },
          turn_detection: {
            type: "agora_vad",
            interrupt_mode: "interrupt",
            threshold: 0.5,
            interrupt_duration_ms: 200,
            silence_duration_ms: 700
          },
          parameters: {
            enable_metrics: true,
            enable_error_message: true
          }
        }
      };

      const credentials = btoa(`${agoraConfig.customerId}:${agoraConfig.customerSecret}`);

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${credentials}`
        },
        body: JSON.stringify(agentConfig)
      });

      if (!response.ok) {
        throw new Error(`Failed to start agent: ${response.status}`);
      }

      const data = await response.json();
      
      setAgentId(data.agent_id);
      setAgentStatus('running');
      setIsVoiceActive(true);
      setMessages(prev => [...prev, {
        role: 'system',
        content: `Voice AI agent is live! Agent ID: ${data.agent_id}. You can now speak to interact.`
      }]);

    } catch (error) {
      console.error('Failed to start Agora agent:', error);
      setAgentStatus('failed');
      setMessages(prev => [...prev, {
        role: 'system',
        content: `Failed to start voice agent: ${error.message}. Please check your credentials and try again.`
      }]);
    }
  };

  const stopAgoraAgent = async () => {
    if (!agentId) return;
    
    try {
      const apiUrl = `https://api.agora.io/api/conversational-ai-agent/v2/projects/${agoraConfig.appId}/leave`;
      const credentials = btoa(`${agoraConfig.customerId}:${agoraConfig.customerSecret}`);

      await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${credentials}`
        },
        body: JSON.stringify({ agent_id: agentId })
      });

      setAgentStatus('idle');
      setIsVoiceActive(false);
      setAgentId(null);
      setMessages(prev => [...prev, {
        role: 'system',
        content: 'Voice AI agent stopped.'
      }]);
    } catch (error) {
      console.error('Failed to stop agent:', error);
    }
  };

  const analyzeSymptoms = (text) => {
    const lowerText = text.toLowerCase();
    
    const urgentKeywords = ['severe', 'emergency', 'urgent', 'chest pain', 'difficulty breathing', 'unconscious', 'bleeding heavily', 'stroke', 'heart attack'];
    const isUrgent = urgentKeywords.some(keyword => lowerText.includes(keyword));
    
    const symptoms = [];
    const symptomMap = {
      'headache': 'headache', 'fever': 'fever', 'cough': 'cough', 
      'pain': 'pain', 'fatigue': 'fatigue', 'nausea': 'nausea',
      'chest pain': 'chest pain', 'breathing': 'breathing difficulty',
      'skin': 'skin issue', 'rash': 'rash', 'joint': 'joint pain'
    };
    
    Object.entries(symptomMap).forEach(([key, value]) => {
      if (lowerText.includes(key)) symptoms.push(value);
    });
    
    let specialty = 'General Medicine';
    if (lowerText.includes('heart') || lowerText.includes('chest pain')) specialty = 'Cardiology';
    else if (lowerText.includes('skin') || lowerText.includes('rash')) specialty = 'Dermatology';
    else if (lowerText.includes('bone') || lowerText.includes('joint')) specialty = 'Orthopedics';
    else if (lowerText.includes('child') || lowerText.includes('kid')) specialty = 'Pediatrics';
    else if (lowerText.includes('brain') || lowerText.includes('head')) specialty = 'Neurology';
    
    return { isUrgent, symptoms, specialty };
  };

  const handleSendMessage = async () => {
    if (!input.trim()) return;
    
    const userMessage = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      const analysis = analyzeSymptoms(userMessage);
      
      const newState = { ...conversationState };
      if (analysis.symptoms.length > 0) {
        newState.symptoms = [...new Set([...newState.symptoms, ...analysis.symptoms])];
        newState.preferredSpecialty = analysis.specialty;
        newState.urgency = analysis.isUrgent ? 'urgent' : 'normal';
      }
      
      const nameMatch = userMessage.match(/(?:my name is|i'm|i am)\s+([a-z]+)/i);
      if (nameMatch) newState.patientName = nameMatch[1];
      
      const locationMatch = userMessage.match(/(?:in|at|near)\s+([a-z\s]+(?:delhi|road|nagar))/i);
      if (locationMatch) newState.location = locationMatch[1];
      
      setConversationState(newState);

      const responses = [
        `I understand you're experiencing ${analysis.symptoms.join(', ')}. ${analysis.isUrgent ? 'This sounds urgent. ' : ''}Can you tell me when these symptoms started?`,
        `Thank you for sharing. Based on your symptoms, I'd recommend consulting a ${analysis.specialty} specialist. Would you like me to find available doctors near you?`,
        `I've found several qualified doctors. Let me show you the available options based on your needs.`
      ];
      
      const aiResponse = responses[Math.min(messages.filter(m => m.role === 'user').length, 2)];
      
      setTimeout(() => {
        setMessages(prev => [...prev, { role: 'assistant', content: aiResponse }]);
        setLoading(false);

        if (newState.symptoms.length > 0 && (userMessage.toLowerCase().includes('show') || userMessage.toLowerCase().includes('find') || userMessage.toLowerCase().includes('yes'))) {
          setTimeout(() => {
            const filtered = doctors.filter(d => 
              d.specialty === newState.preferredSpecialty || 
              (newState.urgency === 'urgent' && d.urgent)
            );
            setFilteredDoctors(filtered.length > 0 ? filtered : doctors.slice(0, 3));
            setShowDoctors(true);
          }, 500);
        }
      }, 1000);

    } catch (error) {
      console.error('Error:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: "I'm here to help! Could you describe your symptoms?" 
      }]);
      setLoading(false);
    }
  };

  const bookAppointment = (doctor, slot) => {
    setMessages(prev => [...prev, {
      role: 'assistant',
      content: `Perfect! I've booked your appointment with ${doctor.name} (${doctor.specialty}) for ${slot}. You'll receive a confirmation SMS and email shortly. The clinic is at ${doctor.location}. Would you like directions?`
    }]);
    setShowDoctors(false);
  };

  const urgentAction = (doctor, action) => {
    const actionText = action === 'video' ? 'video consultation' : 'phone consultation';
    setMessages(prev => [...prev, {
      role: 'assistant',
      content: `Connecting you to ${doctor.name} for immediate ${actionText}. The doctor will be available in approximately 2 minutes. Please stay on the line.`
    }]);
  };

  return (
    <div className="flex h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {showConfig && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl">
            <h2 className="text-2xl font-bold mb-6 text-gray-800">Agora Configuration</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">App ID</label>
                <input
                  type="text"
                  value={agoraConfig.appId}
                  onChange={(e) => setAgoraConfig({...agoraConfig, appId: e.target.value})}
                  placeholder="Your Agora App ID"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Customer ID</label>
                <input
                  type="text"
                  value={agoraConfig.customerId}
                  onChange={(e) => setAgoraConfig({...agoraConfig, customerId: e.target.value})}
                  placeholder="Your Agora Customer ID"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Customer Secret</label>
                <input
                  type="password"
                  value={agoraConfig.customerSecret}
                  onChange={(e) => setAgoraConfig({...agoraConfig, customerSecret: e.target.value})}
                  placeholder="Your Agora Customer Secret"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Channel Name</label>
                <input
                  type="text"
                  value={agoraConfig.channelName}
                  onChange={(e) => setAgoraConfig({...agoraConfig, channelName: e.target.value})}
                  placeholder="Channel name"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setShowConfig(false)}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowConfig(false);
                  setMessages(prev => [...prev, {
                    role: 'system',
                    content: 'Configuration saved! You can now start the voice agent.'
                  }]);
                }}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-lg hover:from-blue-600 hover:to-indigo-600 font-medium"
              >
                Save
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-4">
              Get free credentials at <a href="https://console.agora.io" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">console.agora.io</a>
            </p>
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col bg-white shadow-2xl">
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white p-6 shadow-lg">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-3">
                <MessageSquare className="w-8 h-8" />
                Agora AI Healthcare Assistant
              </h1>
              <p className="text-blue-100 text-sm mt-1">
                Powered by Agora Conversational AI
              </p>
            </div>
            <button
              onClick={() => setShowConfig(true)}
              className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-all"
              title="Configure Agora"
            >
              <Settings className="w-6 h-6" />
            </button>
          </div>
          
          <div className="mt-4 flex items-center gap-3">
            <button
              onClick={() => isVoiceActive ? stopAgoraAgent() : startAgoraAgent()}
              disabled={agentStatus === 'starting'}
              className={`flex items-center gap-2 px-4 py-2 rounded-full font-medium transition-all ${
                isVoiceActive 
                  ? 'bg-red-500 hover:bg-red-600' 
                  : 'bg-green-500 hover:bg-green-600'
              } ${agentStatus === 'starting' ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {agentStatus === 'starting' ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" /> 
                  <span>Starting...</span>
                </>
              ) : isVoiceActive ? (
                <>
                  <MicOff className="w-4 h-4" /> 
                  <span>Stop Voice AI</span>
                </>
              ) : (
                <>
                  <Mic className="w-4 h-4" /> 
                  <span>Start Voice AI</span>
                </>
              )}
            </button>
            <div className={`px-3 py-1 rounded-full text-sm ${
              agentStatus === 'running' ? 'bg-green-500 bg-opacity-20 text-green-100' :
              agentStatus === 'starting' ? 'bg-yellow-500 bg-opacity-20 text-yellow-100' :
              agentStatus === 'failed' ? 'bg-red-500 bg-opacity-20 text-red-100' :
              'bg-gray-500 bg-opacity-20 text-gray-100'
            }`}>
              {agentStatus === 'running' && 'Live'}
              {agentStatus === 'starting' && 'Starting'}
              {agentStatus === 'failed' && 'Failed'}
              {agentStatus === 'idle' && 'Idle'}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gradient-to-b from-gray-50 to-white">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[70%] rounded-2xl px-5 py-3 shadow-md ${
                msg.role === 'user' 
                  ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white' 
                  : msg.role === 'system'
                  ? 'bg-yellow-50 border border-yellow-200 text-yellow-800'
                  : 'bg-white border border-gray-200 text-gray-800'
              }`}>
                <p className="text-sm leading-relaxed">{msg.content}</p>
              </div>
            </div>
          ))}
          
          {loading && (
            <div className="flex justify-start">
              <div className="bg-white shadow-md border border-gray-200 rounded-2xl px-5 py-3">
                <div className="flex gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          )}
          
          {conversationState.urgency === 'urgent' && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg shadow-md animate-pulse">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-6 h-6 text-red-500" />
                <div>
                  <p className="font-semibold text-red-700">Urgent Care Detected</p>
                  <p className="text-sm text-red-600">Prioritizing immediate availability</p>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        <div className="p-4 bg-white border-t border-gray-200 shadow-lg">
          <div className="flex gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder={isVoiceActive ? "Voice AI is active - speak or type..." : "Type your message..."}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              onClick={handleSendMessage}
              disabled={loading || !input.trim()}
              className="px-6 py-3 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 text-white rounded-full hover:from-blue-600 hover:via-indigo-600 hover:to-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
          {isVoiceActive && (
            <p className="text-xs text-center text-gray-500 mt-2">
              Voice AI is listening - you can speak naturally
            </p>
          )}
        </div>
      </div>

      {showDoctors && (
        <div className="w-[480px] bg-white border-l border-gray-200 overflow-y-auto shadow-2xl">
          <div className="sticky top-0 bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6 z-10 shadow-lg">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <User className="w-6 h-6" />
              Available Doctors
            </h2>
            <p className="text-indigo-100 text-sm mt-1">
              {conversationState.preferredSpecialty && `${conversationState.preferredSpecialty} specialists`}
              {conversationState.urgency === 'urgent' && ' - Urgent Care'}
            </p>
          </div>

          <div className="p-4 space-y-4">
            {filteredDoctors.map(doctor => (
              <div key={doctor.id} className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-xl transition-all hover:border-indigo-300">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-bold text-lg text-gray-800">{doctor.name}</h3>
                    <p className="text-indigo-600 font-medium text-sm">{doctor.specialty}</p>
                    <p className="text-gray-500 text-xs mt-1">{doctor.experience} years exp - {doctor.gender}</p>
                  </div>
                  <div className="flex items-center gap-1 bg-yellow-50 px-3 py-1 rounded-full">
                    <Star className="w-4 h-4 text-yellow-500 fill-current" />
                    <span className="text-sm font-semibold text-yellow-700">{doctor.rating}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
                  <div className="flex items-center gap-2 text-gray-600">
                    <MapPin className="w-4 h-4" />
                    <span>{doctor.location} - {doctor.distance}km</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <span className="font-semibold">Rs {doctor.charges}</span>
                  </div>
                </div>

                {conversationState.urgency === 'urgent' && doctor.urgent && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-3">
                    <p className="text-red-700 text-xs font-semibold mb-2 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      Immediate Consultation Available
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => urgentAction(doctor, 'video')}
                        className="flex-1 bg-red-500 text-white px-3 py-2 rounded-lg text-xs font-medium hover:bg-red-600 flex items-center justify-center gap-1 transition-all"
                      >
                        <Video className="w-4 h-4" />
                        Video Now
                      </button>
                      <button
                        onClick={() => urgentAction(doctor, 'call')}
                        className="flex-1 bg-red-600 text-white px-3 py-2 rounded-lg text-xs font-medium hover:bg-red-700 flex items-center justify-center gap-1 transition-all"
                      >
                        <Phone className="w-4 h-4" />
                        Call Now
                      </button>
                    </div>
                  </div>
                )}

                <div className="mb-3">
                  <p className="text-gray-600 text-xs font-semibold mb-2 flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    Available Slots
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {doctor.availability.slice(0, 3).map((slot, idx) => (
                      <button
                        key={idx}
                        onClick={() => bookAppointment(doctor, slot)}
                        className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-medium hover:bg-blue-100 border border-blue-200"
                      >
                        {slot}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => bookAppointment(doctor, doctor.availability[0])}
                  className="w-full bg-gradient-to-r from-blue-500 to-indigo-500 text-white py-2.5 rounded-lg font-medium hover:from-blue-600 hover:to-indigo-600 transition-all shadow"
                >
                  Book Appointment
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AgoraHealthBookingAI;