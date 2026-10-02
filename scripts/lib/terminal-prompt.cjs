/**
 * Hỏi thông tin trực tiếp trong terminal. Dùng cho tài khoản quản trị/nhân viên: các giá trị này chỉ được nhập
 * lúc chạy lệnh, không bao giờ đọc từ biến môi trường hay file .env.
 */
const readline = require('node:readline/promises');

function isInteractive() {
  return Boolean(process.stdin.isTTY && process.stdout.isTTY);
}

function requireInteractiveTerminal() {
  if (isInteractive()) return;
  throw new Error('Lệnh này cần terminal tương tác để nhập tài khoản (PowerShell, cmd hoặc terminal của VS Code). '
    + 'Trên Git Bash hãy chạy qua `winpty`, ví dụ: winpty npm.cmd run admin:create');
}

async function ask(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    return await rl.question(question);
  } finally {
    rl.close();
  }
}

/** Nhập mật khẩu không hiển thị ký tự nào lên màn hình. */
function askHidden(question) {
  const { stdin, stdout } = process;
  return new Promise((resolve, reject) => {
    let value = '';
    stdout.write(question);
    stdin.setRawMode(true);
    stdin.setEncoding('utf8');
    stdin.resume();
    const finish = (error) => {
      stdin.removeListener('data', onData);
      stdin.setRawMode(false);
      stdin.pause();
      stdout.write('\n');
      if (error) reject(error); else resolve(value);
    };
    function onData(chunk) {
      // Phím mũi tên, Home/End… gửi chuỗi điều khiển bắt đầu bằng ESC: bỏ qua cả chuỗi.
      if (chunk.startsWith('\u001b')) return;
      for (const char of chunk) {
        if (char === '\r' || char === '\n') return finish();
        if (char === '\u0003') return finish(new Error('Đã hủy.'));
        if (char === '\u007f' || char === '\b') value = Array.from(value).slice(0, -1).join('');
        else if (char >= ' ') value += char;
      }
    }
    stdin.on('data', onData);
  });
}

/** Hỏi lại cho tới khi `validate` trả về null (hợp lệ). */
async function askUntilValid(question, validate, { hidden = false } = {}) {
  for (;;) {
    const raw = hidden ? await askHidden(question) : await ask(question);
    const value = hidden ? raw : raw.trim();
    const error = validate(value);
    if (!error) return value;
    console.log(`  ✖ ${error}`);
  }
}

module.exports = { isInteractive, requireInteractiveTerminal, ask, askHidden, askUntilValid };
