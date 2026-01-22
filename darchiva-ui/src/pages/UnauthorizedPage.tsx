// (c) Copyright Datacraft, 2026
import { Link } from 'react-router-dom';
import { ShieldAlert, Home, ArrowLeft } from 'lucide-react';

export function UnauthorizedPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-stone-50 dark:bg-stone-950 p-4">
            <div className="max-w-md w-full text-center">
                <div className="mb-6 flex justify-center">
                    <div className="p-4 bg-amber-100 dark:bg-amber-900/30 rounded-full">
                        <ShieldAlert className="w-12 h-12 text-amber-600 dark:text-amber-500" />
                    </div>
                </div>
                <h1 className="text-3xl font-bold text-stone-900 dark:text-stone-100 mb-2">
                    Access Denied
                </h1>
                <p className="text-stone-600 dark:text-stone-400 mb-8">
                    You don't have the required permissions to access this page. If you believe this is an error, please contact your administrator.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <button
                        onClick={() => window.history.back()}
                        className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300 font-medium hover:bg-stone-300 dark:hover:bg-stone-700 transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Go Back
                    </button>
                    <Link
                        to="/"
                        className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg bg-amber-500 text-white font-medium hover:bg-amber-600 transition-colors shadow-lg shadow-amber-500/20"
                    >
                        <Home className="w-4 h-4" />
                        Return Home
                    </Link>
                </div>
            </div>
        </div>
    );
}
