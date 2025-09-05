// components/dataRender.tsx
import { useEffect, useState } from "react";

export default function DataRender() {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const response = await fetch('https://jsonplaceholder.typicode.com/posts');
                 
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                
                const jsonData = await response.json();
                setData(jsonData);
                
                // Log the data to console
                console.log('Fetched data from JSONPlaceholder:', jsonData);
                console.log('Total posts:', jsonData.length);
                console.log('First post:', jsonData[0]);
                
            } catch (err) {
                console.error('Error fetching data:', err);
                setError(err instanceof Error ? err.message : 'An error occurred while fetching data');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    if (loading) {
        return (
            <div className="p-6 max-w-4xl mx-auto">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 transition-colors duration-200">
                    <div className="flex items-center justify-center py-12">
                        <div className="text-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400 mx-auto mb-4"></div>
                            <p className="text-lg font-medium text-gray-900 dark:text-gray-100">Loading data from API...</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Fetching posts from JSONPlaceholder</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }


    
    if (error) {
        return (
            <div className="p-6 max-w-4xl mx-auto">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 transition-colors duration-200">
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
                        <div className="flex items-center">
                            <div className="text-red-600 dark:text-red-400 mr-3">
                                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-red-900 dark:text-red-100">Error Loading Data</h3>
                                <p className="text-red-700 dark:text-red-300 mt-1">{error}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-6xl mx-auto">
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 p-8 transition-all duration-300">
                <div className="text-center mb-8">
                    <h2 className="text-3xl font-bold bg-gradient-to-r from-primary-600 to-blue-600 dark:from-primary-400 dark:to-blue-400 bg-clip-text text-transparent mb-3">
                        API Data from JSONPlaceholder
                    </h2>
                    <p className="text-gray-600 dark:text-gray-400 text-lg">Fetched from: https://jsonplaceholder.typicode.com/posts</p>
                </div>
                
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl p-6 mb-8 shadow-lg">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">Total Posts: {data.length}</p>
                            <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">Successfully loaded from API</p>
                        </div>
                        <div className="text-blue-600 dark:text-blue-400">
                            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border border-yellow-200 dark:border-yellow-800 rounded-2xl p-4 mb-8">
                    <p className="text-sm text-yellow-800 dark:text-yellow-200 text-center font-medium">
                        💡 Check the browser console to see the complete logged data!
                    </p>
                </div>
                
                {/* Display first few posts */}
                <div className="space-y-6">
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 text-center mb-6">Sample Posts (First 5)</h3>
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-1">
                        {data.slice(0, 5).map((post: any, index: number) => (
                            <div key={post.id} className="group border border-gray-200 dark:border-gray-700 rounded-2xl p-6 hover:shadow-xl dark:hover:shadow-2xl transition-all duration-300 bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-700/50 hover:scale-105 hover:-translate-y-1">
                                <div className="flex items-start justify-between mb-4">
                                    <h4 className="font-bold text-gray-900 dark:text-gray-100 text-xl leading-tight group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors duration-300">{post.title}</h4>
                                    <span className="bg-gradient-to-r from-primary-500 to-blue-600 text-white text-sm px-3 py-1 rounded-full ml-3 flex-shrink-0 shadow-lg">
                                        Post #{post.id}
                                    </span>
                                </div>
                                <p className="text-gray-600 dark:text-gray-300 leading-relaxed text-base mb-4">{post.body}</p>
                                <div className="flex items-center justify-between">
                                    <div className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                                        User ID: {post.userId}
                                    </div>
                                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                
                {data.length > 5 && (
                    <div className="mt-8 text-center">
                        <div className="bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 rounded-2xl p-4 inline-block">
                            <p className="text-sm text-gray-600 dark:text-gray-300 font-medium">
                                ... and {data.length - 5} more posts available
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}