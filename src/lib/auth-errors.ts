/**
 * Thông báo cho mã lỗi NextAuth trả về trang đăng nhập (`/login?error=...`). Trước đây trang không đọc tham số này
 * nên khách bấm "Đăng nhập với Google" bị lỗi chỉ thấy quay lại form, không biết vì sao.
 */
const MESSAGES: Record<string, string> = {
  OAuthAccountNotLinked: 'Email Google này đã được đăng ký bằng mật khẩu. Mẹ đăng nhập bằng email và mật khẩu giúp shop nhé.',
  AccessDenied: 'Tài khoản này đang bị khóa hoặc email Google chưa được xác minh. Mẹ liên hệ shop để được hỗ trợ.',
  OAuthSignin: 'Chưa mở được trang đăng nhập Google. Mẹ thử lại sau ít phút nhé.',
  OAuthCallback: 'Google chưa xác nhận được lần đăng nhập này (có thể do quá thời gian). Mẹ bấm đăng nhập lại nhé.',
  OAuthCreateAccount: 'Chưa tạo được tài khoản từ Google. Mẹ thử lại hoặc đăng ký bằng email.',
  Callback: 'Đăng nhập bằng Google chưa hoàn tất. Mẹ thử lại nhé.',
  Configuration: 'Đăng nhập bằng Google đang tạm gián đoạn. Mẹ đăng nhập bằng email và mật khẩu giúp shop nhé.',
  SessionRequired: 'Mẹ đăng nhập để tiếp tục nhé.',
  CredentialsSignin: 'Tên đăng nhập, email hoặc mật khẩu không đúng.',
};

export function authErrorMessage(code: string | null | undefined): string | null {
  if (!code) return null;
  return MESSAGES[code] || 'Đăng nhập chưa thành công. Mẹ thử lại nhé.';
}
