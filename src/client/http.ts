/** Thân phản hồi JSON của API nội bộ: luôn có thể có `error`, các trường còn lại tùy API. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type JsonBody = { error?: string } & Record<string, any>;

/**
 * Đọc JSON của phản hồi mà không ném lỗi cú pháp: lỗi từ hạ tầng (413 quá lớn, 504 hết giờ) trả về văn bản/HTML,
 * trước đây hiện ra cho người dùng thành "Unexpected token …".
 */
export async function readJson(response: Response): Promise<JsonBody> {
  const data = await response.json().catch(() => null);
  if (data && typeof data === 'object') return data as JsonBody;
  if (response.status === 413) return { error: 'Ảnh quá lớn. Chọn ảnh nhỏ hơn 4 MB.' };
  if (response.status === 504) return { error: 'Máy chủ phản hồi quá lâu, vui lòng thử lại.' };
  return { error: response.ok ? 'Phản hồi không hợp lệ từ máy chủ' : `Máy chủ báo lỗi (${response.status}), vui lòng thử lại.` };
}

