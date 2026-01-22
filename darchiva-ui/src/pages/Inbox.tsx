// (c) Copyright Datacraft, 2026
import { Inbox as InboxIcon } from 'lucide-react';
import { InboxList } from '@/features/inbox/components/InboxList';

export function Inbox() {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-display font-semibold text-slate-100">
                        Inbox
                    </h1>
                    <p className="mt-1 text-sm text-slate-500">
                        Manage your document approval tasks and workflow actions
                    </p>
                </div>
            </div>

            <div className="max-w-5xl">
                <InboxList />
            </div>
        </div>
    );
}

export default Inbox;
