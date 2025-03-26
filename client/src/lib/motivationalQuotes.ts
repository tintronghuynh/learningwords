interface Quote {
  en: string;
  vi: string;
  author: string;
}

const motivationalQuotes: Quote[] = [
  {
    en: "The only way to do great work is to love what you do.",
    vi: "Cách duy nhất để làm việc xuất sắc là yêu thích việc bạn làm.",
    author: "Steve Jobs"
  },
  {
    en: "Your time is limited, don't waste it living someone else's life.",
    vi: "Thời gian của bạn có hạn, đừng lãng phí nó bằng cách sống cuộc đời của người khác.",
    author: "Steve Jobs"
  },
  {
    en: "Success is not final, failure is not fatal: It is the courage to continue that counts.",
    vi: "Thành công không phải là điểm cuối, thất bại không phải là chết chóc: Lòng can đảm để tiếp tục mới là điều quan trọng.",
    author: "Winston Churchill"
  },
  {
    en: "The future belongs to those who believe in the beauty of their dreams.",
    vi: "Tương lai thuộc về những người tin tưởng vào vẻ đẹp của ước mơ.",
    author: "Eleanor Roosevelt"
  },
  {
    en: "It does not matter how slowly you go as long as you do not stop.",
    vi: "Không quan trọng bạn đi chậm thế nào, miễn là bạn không dừng lại.",
    author: "Confucius"
  },
  {
    en: "It always seems impossible until it's done.",
    vi: "Mọi thứ luôn có vẻ không thể làm được cho đến khi nó được hoàn thành.",
    author: "Nelson Mandela"
  },
  {
    en: "Don't watch the clock; do what it does. Keep going.",
    vi: "Đừng nhìn đồng hồ; hãy làm như nó. Hãy tiếp tục.",
    author: "Sam Levenson"
  },
  {
    en: "Believe you can and you're halfway there.",
    vi: "Tin rằng bạn có thể và bạn đã đi được nửa đường.",
    author: "Theodore Roosevelt"
  },
  {
    en: "Ever tried. Ever failed. No matter. Try again. Fail again. Fail better.",
    vi: "Đã từng thử. Đã từng thất bại. Không sao. Thử lại. Thất bại lại. Thất bại tốt hơn.",
    author: "Samuel Beckett"
  },
  {
    en: "The harder you work for something, the greater you'll feel when you achieve it.",
    vi: "Bạn càng nỗ lực cho điều gì đó, bạn sẽ càng cảm thấy vĩ đại khi đạt được nó.",
    author: "Unknown"
  },
  {
    en: "The only limit to our realization of tomorrow will be our doubts of today.",
    vi: "Giới hạn duy nhất cho sự thực hiện ngày mai sẽ là những nghi ngờ của chúng ta hôm nay.",
    author: "Franklin D. Roosevelt"
  },
  {
    en: "What you get by achieving your goals is not as important as what you become by achieving your goals.",
    vi: "Những gì bạn đạt được bằng cách thực hiện mục tiêu không quan trọng bằng việc bạn trở thành ai khi đạt được mục tiêu đó.",
    author: "Zig Ziglar"
  },
  {
    en: "A journey of a thousand miles begins with a single step.",
    vi: "Hành trình ngàn dặm bắt đầu từ một bước chân.",
    author: "Lao Tzu"
  },
  {
    en: "The best time to plant a tree was 20 years ago. The second best time is now.",
    vi: "Thời điểm tốt nhất để trồng một cái cây là 20 năm trước. Thời điểm tốt thứ hai là ngay bây giờ.",
    author: "Chinese Proverb"
  },
  {
    en: "Your attitude, not your aptitude, will determine your altitude.",
    vi: "Thái độ của bạn, không phải năng khiếu, sẽ quyết định độ cao bạn đạt được.",
    author: "Zig Ziglar"
  },
  {
    en: "Strive not to be a success, but rather to be of value.",
    vi: "Đừng cố gắng để thành công, mà hãy cố gắng để tạo ra giá trị.",
    author: "Albert Einstein"
  },
  {
    en: "The difference between ordinary and extraordinary is that little extra.",
    vi: "Sự khác biệt giữa bình thường và phi thường là một chút nỗ lực thêm đó.",
    author: "Jimmy Johnson"
  },
  {
    en: "Hardships often prepare ordinary people for an extraordinary destiny.",
    vi: "Những khó khăn thường chuẩn bị cho những người bình thường một số phận phi thường.",
    author: "C.S. Lewis"
  },
  {
    en: "We must embrace pain and burn it as fuel for our journey.",
    vi: "Chúng ta phải đón nhận nỗi đau và đốt nó làm nhiên liệu cho hành trình của mình.",
    author: "Kenji Miyazawa"
  },
  {
    en: "The beautiful thing about learning is that no one can take it away from you.",
    vi: "Điều tuyệt vời về việc học là không ai có thể lấy đi điều đó từ bạn.",
    author: "B.B. King"
  }
];

export function getRandomQuote(): Quote {
  const randomIndex = Math.floor(Math.random() * motivationalQuotes.length);
  return motivationalQuotes[randomIndex];
}

export default motivationalQuotes;
