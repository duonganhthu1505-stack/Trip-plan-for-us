import React, { useEffect, useState } from 'react';
import { History, Download, RotateCcw } from 'lucide-react';
import { fetchSharedHistory, fetchSharedVersion, type SharedVersion } from '../utils/sharedSync';
import { downloadJsonFile } from '../utils/storage';

export function VersionHistory({ onRestore }: { onRestore: (id: string) => Promise<void> }) {
  const [versions, setVersions] = useState<SharedVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<SharedVersion | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [message, setMessage] = useState('');
  const load = async () => {
    setLoading(true); setError('');
    try { setVersions(await fetchSharedHistory()); }
    catch { setError('Không tải được lịch sử. Kiểm tra kết nối và thử lại.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);
  const inspect = async (version: SharedVersion, download = false) => {
    setBusy(true); setError(''); setConfirm(false);
    try {
      const { data } = await fetchSharedVersion(version.id);
      if (download) downloadJsonFile(data, `travel-planner-version-${version.revision}.json`);
      else { setSelected(version); setPreview(JSON.stringify(data, null, 2)); }
    } catch { setError('Không mở được phiên bản. Bản sao có thể đã hết hạn; hãy tải lại danh sách.'); }
    finally { setBusy(false); }
  };
  const restore = async () => {
    if (!selected) return;
    setBusy(true); setError(''); setMessage('');
    try {
      await onRestore(selected.id);
      setSelected(null); setPreview(null); setConfirm(false);
      setMessage('Đã khôi phục thành phiên bản mới. Các thiết bị đang mở sẽ tự cập nhật.');
      await load();
    } catch (err) { setError(err instanceof Error ? err.message : 'Không thể khôi phục. Vui lòng thử lại.'); }
    finally { setBusy(false); }
  };
  const button = 'px-3 py-2 rounded-xl border border-[#D9CABB] text-xs font-medium hover:bg-[#EFE8DE] disabled:opacity-50 disabled:cursor-wait focus-visible:outline-2 focus-visible:outline-[#8C6D58]';
  return <section className="bg-[#FFFDF9] border border-[#E8DEC8] rounded-3xl p-6 sm:p-8 space-y-5" aria-labelledby="version-history-heading">
    <div className="flex flex-wrap justify-between items-start gap-3 border-b border-[#F0E6D8] pb-4">
      <div className="flex gap-3"><History className="w-5 h-5 mt-1 text-[#8C6D58]" /><div>
        <h3 id="version-history-heading" className="font-serif text-lg font-bold text-[#382D24]">Lịch sử phiên bản</h3>
        <p className="text-xs text-[#8C6D58] mt-1">Bản hiện tại luôn được giữ. Mỗi bản cũ được giữ 30 ngày kể từ khi thay thế. Khôi phục sẽ tạo phiên bản mới cho toàn bộ nhật ký.</p>
        <p className="text-xs text-[#8C6D58] mt-1">Lịch sử bắt đầu từ khi tính năng này được triển khai; dữ liệu đã bị ghi đè trước đó không có trong đây.</p>
      </div></div>
      <button className={button} disabled={loading || busy} onClick={() => void load()}>Tải lại</button>
    </div>
    {error && <p role="alert" className="text-sm text-[#B85340]">{error}</p>}
    {message && <p role="status" className="text-sm text-[#52634B]">{message}</p>}
    {loading ? <div role="status" aria-label="Đang tải lịch sử" className="space-y-3 animate-pulse"><div className="h-16 bg-[#EFE6DB] rounded-xl" /><div className="h-16 bg-[#FAF7F2] rounded-xl" /></div>
      : versions.length === 0 ? <p className="text-sm text-[#735D4E]">Chưa có phiên bản trên server. Lịch sử xuất hiện sau lần đồng bộ thành công đầu tiên.</p>
      : <ol className="max-h-96 overflow-y-auto divide-y divide-[#F0E6D8]">
        {versions.map(version => <li key={version.id} className="py-4 flex flex-wrap justify-between gap-3 items-center">
          <div className="min-w-0"><p className="text-sm font-semibold text-[#382D24]">Phiên bản {version.revision} {version.current && <span className="ml-2 text-xs text-[#52634B]">Hiện tại</span>}</p>
            <p className="text-xs text-[#8C6D58] mt-1">{version.createdAt ? new Date(version.createdAt).toLocaleString('vi-VN') : 'Bản lưu trước khi có lịch sử'} · {version.trips.length} chuyến đi{version.restoredFrom ? ' · Được khôi phục' : ''}</p>
          </div>
          <div className="flex gap-2"><button disabled={busy} className={button} onClick={() => void inspect(version)}>Xem</button><button disabled={busy} className={button + ' flex items-center gap-1'} onClick={() => void inspect(version, true)} aria-label={`Tải JSON phiên bản ${version.revision}`}><Download className="w-3.5 h-3.5" />JSON</button></div>
        </li>)}
      </ol>}
    {selected && <div className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#E2D4C3] space-y-3">
      <div className="flex justify-between items-center gap-2"><h4 className="text-sm font-semibold">Phiên bản {selected.revision}</h4><button disabled={busy} className={button} onClick={() => { setSelected(null); setConfirm(false); }}>Đóng</button></div>
      <ul className="text-sm text-[#735D4E] list-disc pl-5">{selected.trips.map((name, index) => <li key={index}>{name}</li>)}</ul>
      <details><summary className="text-xs cursor-pointer text-[#735D4E]">Xem toàn bộ dữ liệu</summary><pre className="max-h-64 overflow-auto text-xs p-3 mt-2 bg-[#FFFDF9] rounded-xl whitespace-pre-wrap break-all">{preview}</pre></details>
      {!selected.current && (confirm ? <div className="space-y-3"><p className="text-sm text-[#B85340]">Thay toàn bộ dữ liệu hiện tại bằng phiên bản {selected.revision} trên mọi thiết bị? Bản hiện tại vẫn được giữ trong lịch sử. Quyền truy cập không thay đổi.</p><div className="flex flex-wrap gap-2"><button disabled={busy} className={button + ' bg-[#5C4033] text-white'} onClick={() => void restore()}>{busy ? 'Đang khôi phục…' : 'Xác nhận khôi phục'}</button><button disabled={busy} className={button} onClick={() => setConfirm(false)}>Hủy</button></div></div>
        : <button disabled={busy} className={button + ' flex items-center gap-2'} onClick={() => setConfirm(true)}><RotateCcw className="w-4 h-4" />Khôi phục phiên bản này</button>)}
    </div>}
  </section>;
}
