'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { Bot, Loader2, MessageSquare, Plus, Send, Sparkles, Palette, FileText, Globe, Megaphone, Check, Brain, Code, PenTool, Image as LucideImage } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';

const IconMap: Record<string, React.ElementType> = {
  Palette,
  Bot,
  Sparkles,
  FileText,
  Globe,
  Megaphone,
  Check,
  Brain,
  Code,
  PenTool,
  Image: LucideImage
};

function AgentIcon({ icon, className }: { icon: string | null; className?: string }) {
  const IconComponent = icon && IconMap[icon] ? IconMap[icon] : Bot;
  return <IconComponent className={className} />;
}

// Types
interface AIAgent {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  icon: string | null;
  pipelineType: string;
}

interface AIConversation {
  id: string;
  title: string | null;
  agent: {
    id: string;
    slug: string;
    name: string;
    icon: string | null;
  };
  lastMessageAt: string | null;
  lastMessage?: {
    content: string;
    role: string;
    createdAt: string | null;
  } | null;
  createdAt: string | null;
}

interface AIMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  metadata?: {
    runId?: string;
    artifacts?: string[];
    error?: string;
  };
  createdAt: string | null;
}

export function AIHubPanel() {
  const [agents, setAgents] = useState<AIAgent[]>([]);
  const [conversations, setConversations] = useState<AIConversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [showAgentList, setShowAgentList] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch agents and conversations (credentials: include so session cookie is sent)
  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const [agentsRes, conversationsRes] = await Promise.all([
          fetch('/api/ai/hub/agents', { credentials: 'include' }),
          fetch('/api/ai/conversations', { credentials: 'include' }),
        ]);

        if (agentsRes.ok) {
          const agentsData = await agentsRes.json();
          // API returns {ok: true, data: {agents: [...]}}
          const agents = agentsData.data?.agents || agentsData.agents || [];
          setAgents(agents);
        }
        // If 401, agents stay [] — user may need to re-login or session format differs
        if (!agentsRes.ok && agentsRes.status === 401) {
          console.warn('[AI Hub] Agents API returned 401 — check session / auth');
        }

        if (conversationsRes.ok) {
          const conversationsData = await conversationsRes.json();
          // API returns {ok: true, data: {conversations: [...]}}
          const conversations = conversationsData.data?.conversations || conversationsData.conversations || [];
          setConversations(conversations);
        }
      } catch (error) {
        console.error('Failed to fetch AI Hub data:', error);
      } finally {
        setLoading(false);
      }
    }

    void fetchData();
  }, []);

  // Fetch messages when conversation changes
  useEffect(() => {
    if (!activeConversationId) {
      setMessages([]);
      return;
    }

    async function fetchMessages() {
      setLoadingMessages(true);
      try {
        const res = await fetch(`/api/ai/conversations/${activeConversationId}/messages`, {
          credentials: 'include',
        });
        if (res.ok) {
          const data = await res.json();
          // API returns {ok: true, data: {messages: [...]}}
          const messages = data.data?.messages || data.messages || [];
          setMessages(messages);
        }
      } catch (error) {
        console.error('Failed to fetch messages:', error);
      } finally {
        setLoadingMessages(false);
      }
    }

    void fetchMessages();
  }, [activeConversationId]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Start new conversation with agent
  const startConversation = useCallback(async (agentSlug: string) => {
    try {
      const res = await fetch('/api/ai/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentSlug }),
        credentials: 'include',
      });

      if (res.ok) {
        const data = await res.json();
        // API returns {ok: true, data: {conversation: {...}}}
        const conversation = data.data?.conversation || data.conversation;
        
        const newConversationId = conversation?.id;
        if (!newConversationId) {
          console.error('No conversation ID returned from API');
          return;
        }

        // Refresh conversations list
        const conversationsRes = await fetch('/api/ai/conversations', { credentials: 'include' });
        if (conversationsRes.ok) {
          const conversationsData = await conversationsRes.json();
          const conversations = conversationsData.data?.conversations || conversationsData.conversations || [];
          setConversations(conversations);
        }

        setActiveConversationId(newConversationId);
        setShowAgentList(false);
      } else {
        console.error('Failed to create conversation:', res.status, await res.text());
      }
    } catch (error) {
      console.error('Failed to start conversation:', error);
    }
  }, []);

  // Send message
  const sendMessage = useCallback(async () => {
    if (!inputValue.trim() || !activeConversationId || sendingMessage) return;

    const content = inputValue.trim();
    setInputValue('');
    setSendingMessage(true);

    // Optimistically add user message
    const tempUserMessage: AIMessage = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMessage]);

    try {
      const res = await fetch(`/api/ai/conversations/${activeConversationId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
        credentials: 'include',
      });

      if (res.ok) {
        const data = await res.json();
        // API returns {ok: true, data: {userMessage, assistantMessage?}}
        const userMessage = data.data?.userMessage || data.userMessage;
        const assistantMessage = data.data?.assistantMessage || data.assistantMessage;

        // Replace temp message with real one and add assistant message
        setMessages((prev) => {
          const filtered = prev.filter((m) => m.id !== tempUserMessage.id);
          const newMessages = userMessage ? [userMessage] : [];
          if (assistantMessage) {
            newMessages.push(assistantMessage);
          }
          return [...filtered, ...newMessages];
        });

        // Update conversation in list
        setConversations((prev) =>
          prev.map((conv) =>
            conv.id === activeConversationId
              ? {
                  ...conv,
                  lastMessageAt: new Date().toISOString(),
                  lastMessage: assistantMessage || userMessage,
                }
              : conv
          )
        );
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      // Remove optimistic message on error
      setMessages((prev) => prev.filter((m) => m.id !== tempUserMessage.id));
    } finally {
      setSendingMessage(false);
    }
  }, [inputValue, activeConversationId, sendingMessage]);

  // Get active conversation
  const activeConversation = conversations.find((c) => c.id === activeConversationId);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
      </div>
    );
  }

  return (
    <div className="flex h-full gap-4">
      {/* Sidebar: Agents and Conversations */}
      <section className="flex h-full w-[320px] flex-shrink-0 flex-col rounded-2xl border border-neutral-800/70 bg-neutral-950/80 p-3">
        {/* Header */}
        <div className="flex items-center justify-between pb-3">
          <h3 className="text-sm font-medium text-neutral-200">AI-агенты</h3>
          <Button
            size="sm"
            variant="ghost"
            className="h-8 gap-1.5 text-xs text-indigo-400 hover:bg-indigo-500/10 hover:text-indigo-300"
            onClick={() => setShowAgentList(!showAgentList)}
          >
            <Plus className="h-3.5 w-3.5" />
            Новый чат
          </Button>
        </div>

        {/* Agent selection (when starting new chat) */}
        {showAgentList && (
          <div className="mb-3 rounded-xl border border-neutral-800/70 bg-neutral-900/50 p-2">
            <p className="mb-2 text-xs text-neutral-400">Выберите агента:</p>
            <div className="space-y-1">
              {agents.map((agent) => (
                <button
                  key={agent.id}
                  onClick={() => startConversation(agent.slug)}
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left transition-colors hover:bg-neutral-800/50"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/20 text-indigo-400">
                    <AgentIcon icon={agent.icon} className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-medium text-neutral-200">{agent.name}</p>
                    {agent.description && (
                      <p className="truncate text-xs text-neutral-500">{agent.description}</p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Conversations list */}
        <ScrollArea className="flex-1">
          <div className="space-y-1">
            {conversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Sparkles className="mb-2 h-8 w-8 text-indigo-400/50" />
                <p className="text-sm text-neutral-400">Нет диалогов</p>
                <p className="text-xs text-neutral-500">Начните новый чат с AI-агентом</p>
              </div>
            ) : (
              conversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => {
                    setActiveConversationId(conv.id);
                    setShowAgentList(false);
                  }}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left transition-colors',
                    activeConversationId === conv.id
                      ? 'bg-indigo-500/20 text-indigo-200'
                      : 'hover:bg-neutral-800/50'
                  )}
                >
                  <div
                    className={cn(
                      'flex h-9 w-9 items-center justify-center rounded-lg',
                      activeConversationId === conv.id
                        ? 'bg-indigo-500/30 text-indigo-300'
                        : 'bg-neutral-800/50 text-neutral-400'
                    )}
                  >
                    <AgentIcon icon={conv.agent.icon} className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-medium">{conv.agent.name}</p>
                    {conv.lastMessage && (
                      <p className="truncate text-xs text-neutral-500">
                        {conv.lastMessage.content}
                      </p>
                    )}
                  </div>
                  {conv.lastMessageAt && (
                    <span className="text-[10px] text-neutral-500">
                      {formatDistanceToNow(new Date(conv.lastMessageAt), {
                        addSuffix: false,
                        locale: ru,
                      })}
                    </span>
                  )}
                </button>
              ))
            )}
          </div>
        </ScrollArea>
      </section>

      {/* Main: Chat area */}
      <section className="flex flex-1 flex-col rounded-2xl border border-neutral-800/70 bg-neutral-950/80">
        {activeConversation ? (
          <>
            {/* Chat header */}
            <div className="flex items-center gap-3 border-b border-neutral-800/70 px-4 py-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-400">
                <AgentIcon icon={activeConversation.agent.icon} className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-neutral-200">
                  {activeConversation.agent.name}
                </h3>
                <p className="text-xs text-neutral-500">AI-агент</p>
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              {loadingMessages ? (
                <div className="flex h-full items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-indigo-400" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-center">
                  <MessageSquare className="mb-2 h-10 w-10 text-neutral-600" />
                  <p className="text-sm text-neutral-400">Начните диалог</p>
                  <p className="text-xs text-neutral-500">
                    Напишите сообщение, чтобы начать общение с агентом
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={cn(
                        'flex',
                        msg.role === 'user' ? 'justify-end' : 'justify-start'
                      )}
                    >
                      <div
                        className={cn(
                          'max-w-[80%] rounded-2xl px-4 py-2',
                          msg.role === 'user'
                            ? 'bg-indigo-600 text-white'
                            : 'bg-neutral-800/70 text-neutral-200'
                        )}
                      >
                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                        {msg.metadata?.runId && (
                          <p className="mt-1 text-xs opacity-60">
                            Run ID: {msg.metadata.runId}
                          </p>
                        )}
                        {msg.createdAt && (
                          <p
                            className={cn(
                              'mt-1 text-[10px]',
                              msg.role === 'user' ? 'text-white/60' : 'text-neutral-500'
                            )}
                          >
                            {formatDistanceToNow(new Date(msg.createdAt), {
                              addSuffix: true,
                              locale: ru,
                            })}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </ScrollArea>

            {/* Input */}
            <div className="border-t border-neutral-800/70 p-4">
              <div className="flex items-center gap-2">
                <Input
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      void sendMessage();
                    }
                  }}
                  placeholder="Напишите сообщение..."
                  className="flex-1 border-neutral-800/70 bg-neutral-900/50"
                  disabled={sendingMessage}
                />
                <Button
                  onClick={sendMessage}
                  disabled={!inputValue.trim() || sendingMessage}
                  className="h-10 w-10 bg-indigo-600 p-0 hover:bg-indigo-500"
                >
                  {sendingMessage ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </>
        ) : (
          /* Empty state */
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20">
              <Bot className="h-8 w-8 text-indigo-400" />
            </div>
            <h3 className="mb-1 text-lg font-medium text-neutral-200">AI Hub</h3>
            <p className="mb-4 max-w-sm text-sm text-neutral-400">
              Общайтесь напрямую с AI-агентами. Выберите диалог слева или начните новый чат.
            </p>
            <Button
              onClick={() => setShowAgentList(true)}
              className="gap-2 bg-indigo-600 hover:bg-indigo-500"
            >
              <Plus className="h-4 w-4" />
              Начать новый чат
            </Button>
          </div>
        )}
      </section>
    </div>
  );
}
