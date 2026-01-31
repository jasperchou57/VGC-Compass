export default function LimitedDataNotice() {
    return (
        <div className="bg-yellow-900/30 border border-yellow-700 rounded-lg p-4 mb-6">
            <div className="flex items-start">
                <span className="text-yellow-400 text-xl mr-3">⚠️</span>
                <div>
                    <h3 className="font-semibold text-yellow-200 mb-1">Limited Data Notice</h3>
                    <p className="text-yellow-100/80 text-sm">
                        This page is based on limited high-rated samples. Statistics may be less reliable.
                        More replays available below.
                    </p>
                </div>
            </div>
        </div>
    );
}
