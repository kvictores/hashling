export interface DemoEmail {
  id: string
  from: string
  address: string
  subject: string
  preview: string
  time: string
  body: { p?: string; link?: { text: string; href: string } }[]
  attachment?: string
  expected: 'scam' | 'suspicious' | 'safe'
}

// 3 scams, 1 suspicious, 2 safe. Fictional brands only.
export const EMAILS: DemoEmail[] = [
  {
    id: 'e1', from: 'SwiftShip Delivery', address: 'noreply@swiftship-tracking-notice.com', time: '9:41 AM', expected: 'scam',
    subject: 'Action required: package held at depot',
    preview: 'Your package could not be delivered because customs duty was not paid…',
    body: [
      { p: 'Dear Customer,' },
      { p: 'Your package could not be delivered because a customs duty of $3.20 was not paid. Please pay at the link below within 48 hours to avoid return to sender.' },
      { link: { text: 'Pay customs duty now', href: 'https://swiftship-tracking-notice.com/pay' } },
      { p: 'SwiftShip Parcel Services' },
    ],
  },
  {
    id: 'e2', from: 'Northbridge Bank', address: 'security@northbridgebank-alerts.com', time: '8:15 AM', expected: 'scam',
    subject: 'Unusual sign-in attempt on your account',
    preview: 'We noticed an unusual sign-in to your online banking. Confirm your identity…',
    body: [
      { p: 'Dear Valued Customer,' },
      { p: 'We noticed an unusual sign-in to your online banking. If this wasn’t you, your account will be suspended within 24 hours.' },
      { link: { text: 'Confirm your identity', href: 'http://northbridgebank-alerts.com/login' } },
      { p: 'Northbridge Bank Security Team' },
    ],
  },
  {
    id: 'e3', from: 'Dana Whitfield', address: 'dana.whitfield.ceo@gmail.com', time: 'Yesterday', expected: 'scam',
    subject: 'Quick favor',
    preview: 'Hi, are you available? I need you to buy 5 gift cards for a client today…',
    body: [
      { p: 'Hi, are you available?' },
      { p: 'I need you to buy 5 gift cards for a client today, $200 each. Scratch off the codes and email me photos. Keep this between us, I’m in a meeting and can’t talk.' },
      { p: 'Dana' },
    ],
  },
  {
    id: 'e4', from: 'Campus Housing Office', address: 'housing.office@student-portal-mail.com', time: 'Yesterday', expected: 'suspicious',
    subject: 'Annual housing survey',
    preview: 'Your housing portal access will be deactivated unless you complete…',
    body: [
      { p: 'Hi student,' },
      { p: 'Your housing portal access will be deactivated unless you complete the annual survey.' },
      { link: { text: 'Start survey', href: 'https://bit.ly/housing-survey-25' } },
      { p: 'Housing Office' },
    ],
  },
  {
    id: 'e5', from: 'MegaMart', address: 'orders@megamart.com', time: 'Mon', expected: 'safe',
    subject: 'Your MegaMart order has shipped',
    preview: 'Good news! Your order #MM-20931 has shipped and should arrive Thursday.',
    body: [
      { p: 'Hi Maya,' },
      { p: 'Good news! Your order #MM-20931 has shipped and should arrive Thursday.' },
      { link: { text: 'Track your order', href: 'https://megamart.com/orders/MM-20931' } },
      { p: 'Thanks for shopping with MegaMart.' },
    ],
  },
  {
    id: 'e6', from: 'Sam Patel', address: 'sam.patel@gmail.com', time: 'Sun', expected: 'safe',
    subject: 'Photos from the hike',
    preview: 'Hey! Here are the photos from Saturday. The sunset ones came out great.',
    body: [
      { p: 'Hey!' },
      { p: 'Here are the photos from Saturday. The sunset ones came out great. Let’s plan the next trip soon.' },
      { p: 'Sam' },
    ],
    attachment: 'hike-photos.jpg',
  },
]
