// Document Q&A — Chat panel component
import { useRef, useEffect, useState, KeyboardEvent } from 'react';
import { MessageCircle, Send, Loader2, Plus } from 'lucide-react';
import { useChatWithDocument, useConversationHistory } from './api';

interface ChatPanelProps {
	documentId: string;
}

const EXAMPLE_PROMPTS = [
	'Summarize this document',
	'What are the key dates?',
	'Who are the parties mentioned?',
];

export function ChatPanel({ documentId }: ChatPanelProps) {
	const [conversationId, setConversationId] = useState<string | null>(null);
	const [inputText, setInputText] = useState('');
	const messagesEndRef = useRef<HTMLDivElement>(null);

	const { data: history } = useConversationHistory(documentId, conversationId);
	const chatMutation = useChatWithDocument(documentId);

	const messages = history?.messages ?? [];

	// Scroll to bottom whenever messages update or mutation is pending
	useEffect(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
	}, [messages.length, chatMutation.isPending]);

	const sendMessage = (text: string) => {
		const question = text.trim();
		if (!question || chatMutation.isPending) return;

		chatMutation.mutate(
			{ question, conversation_id: conversationId ?? undefined },
			{
				onSuccess: (result) => {
					setConversationId(result.conversation_id);
					setInputText('');
				},
			},
		);
	};

	const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			sendMessage(inputText);
		}
	};

	const handleNewChat = () => {
		setConversationId(null);
		setInputText('');
		chatMutation.reset();
	};

	return (
		<div className="flex flex-col h-full bg-slate-900">
			{/* Header */}
			<div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 shrink-0">
				<div className="flex items-center gap-2 text-slate-200">
					<MessageCircle className="w-4 h-4 text-brass-400" />
					<span className="text-sm font-medium">Document Q&amp;A</span>
				</div>
				<button
					onClick={handleNewChat}
					className="flex items-center gap-1 px-2 py-1 text-xs rounded-md border border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-600 transition-colors"
					title="Start a new conversation"
				>
					<Plus className="w-3 h-3" />
					New Chat
				</button>
			</div>

			{/* Messages area */}
			<div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2 min-h-0">
				{!conversationId && messages.length === 0 && !chatMutation.isPending ? (
					/* Empty state — example prompt chips */
					<div className="flex flex-col items-center justify-center h-full gap-4 text-center">
						<MessageCircle className="w-10 h-10 text-slate-700" />
						<p className="text-sm text-slate-500">Ask anything about this document</p>
						<div className="flex flex-col gap-2 w-full max-w-xs">
							{EXAMPLE_PROMPTS.map((prompt) => (
								<button
									key={prompt}
									onClick={() => sendMessage(prompt)}
									className="px-3 py-2 text-xs text-left rounded-lg border border-slate-700 text-slate-400 hover:text-slate-200 hover:border-brass-500/50 hover:bg-brass-500/5 transition-colors"
								>
									{prompt}
								</button>
							))}
						</div>
					</div>
				) : (
					<>
						{messages.map((msg) => (
							<div
								key={msg.id}
								className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
							>
								<div
									className={`max-w-[85%] rounded-lg px-3 py-2 text-xs leading-relaxed whitespace-pre-wrap ${
										msg.role === 'user'
											? 'bg-brass-500/20 text-brass-100'
											: 'bg-slate-800 text-slate-200'
									}`}
								>
									{msg.content}
									{msg.page_references && msg.page_references.length > 0 && (
										<div className="mt-1.5 pt-1.5 border-t border-slate-700/50 text-slate-500 text-[10px]">
											Pages: {msg.page_references.join(', ')}
										</div>
									)}
								</div>
							</div>
						))}

						{/* Pending spinner bubble */}
						{chatMutation.isPending && (
							<div className="flex justify-start">
								<div className="bg-slate-800 rounded-lg px-3 py-2">
									<Loader2 className="w-3.5 h-3.5 animate-spin text-brass-400" />
								</div>
							</div>
						)}
					</>
				)}
				<div ref={messagesEndRef} />
			</div>

			{/* Input area */}
			<div className="border-t border-slate-800 p-3 shrink-0">
				<div className="flex gap-2 items-end">
					<textarea
						rows={2}
						value={inputText}
						onChange={(e) => setInputText(e.target.value)}
						onKeyDown={handleKeyDown}
						disabled={chatMutation.isPending}
						placeholder="Ask a question… (Enter to send)"
						className="flex-1 resize-none rounded-lg bg-slate-800 border border-slate-700 text-slate-200 placeholder-slate-500 text-xs px-3 py-2 focus:outline-none focus:border-brass-500/60 disabled:opacity-50 transition-colors"
					/>
					<button
						onClick={() => sendMessage(inputText)}
						disabled={!inputText.trim() || chatMutation.isPending}
						className="p-2 rounded-lg bg-brass-500/20 text-brass-400 border border-brass-500/30 hover:bg-brass-500/30 hover:text-brass-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
						title="Send"
					>
						{chatMutation.isPending ? (
							<Loader2 className="w-4 h-4 animate-spin" />
						) : (
							<Send className="w-4 h-4" />
						)}
					</button>
				</div>
			</div>
		</div>
	);
}
