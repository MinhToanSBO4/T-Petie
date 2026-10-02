/** Thân phản hồi JSON của API nội bộ: luôn có thể có `error`, các trường còn lại tùy API. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type JsonBody = { error?: string } & Record<string, any>;

function bodyFrom(data: unknown, status: number, ok: boolean): JsonBody {
  if (data && typeof data === 'object') return data as JsonBody;
  if (status === 413) return { error: 'Dung lượng ảnh gửi lên quá lớn (tối đa khoảng 4 MB mỗi lần). Bớt ảnh hoặc chọn ảnh nhỏ hơn.' };
  if (status === 504) return { error: 'Máy chủ phản hồi quá lâu, vui lòng thử lại.' };
  return { error: ok ? 'Phản hồi không hợp lệ từ máy chủ' : `Máy chủ báo lỗi (${status}), vui lòng thử lại.` };
}

/**
 * Đọc JSON của phản hồi mà không ném lỗi cú pháp: lỗi từ hạ tầng (413 quá lớn, 504 hết giờ) trả về văn bản/HTML,
 * trước đây hiện ra cho người dùng thành "Unexpected token …".
 */
export async function readJson(response: Response): Promise<JsonBody> {
  return bodyFrom(await response.json().catch(() => null), response.status, response.ok);
}

/**
 * Gửi dữ liệu (thường là FormData có ảnh) và báo tiến độ tải lên: `onProgress` nhận 0–1. fetch() chưa báo được
 * tiến độ upload nên dùng XMLHttpRequest. Phản hồi đọc như `readJson`; mất mạng ném TypeError như fetch.
 */
export function sendWithProgress(url: string, { method = 'POST', body, onProgress }: {
  method?: string; body: XMLHttpRequestBodyInit; onProgress?: (fraction: number) => void;
}): Promise<{ ok: boolean; status: number; data: JsonBody }> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open(method, url);
    if (onProgress) {
      request.upload.onprogress = (event) => { if (event.lengthComputable && event.total > 0) onProgress(event.loaded / event.total); };
    }
    request.onload = () => {
      let parsed: unknown = null;
      try { parsed = JSON.parse(request.responseText); } catch { /* văn bản/HTML từ hạ tầng */ }
      const ok = request.status >= 200 && request.status < 300;
      resolve({ ok, status: request.status, data: bodyFrom(parsed, request.status, ok) });
    };
    request.onerror = () => reject(new TypeError('Failed to fetch'));
    request.ontimeout = () => reject(new TypeError('Failed to fetch'));
    request.send(body);
  });
}
