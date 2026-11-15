/** Synthetic paths; expected strings follow fish's single-quote escape rules. */
export const fishQuotingCases = [
  { name: 'spaces', value: '/tmp/folder with spaces/a.png', quoted: "'/tmp/folder with spaces/a.png'" },
  { name: 'apostrophe', value: "/tmp/O'Brien.png", quoted: String.raw`'/tmp/O\'Brien.png'` },
  { name: 'trailing backslash', value: '/tmp/end\\', quoted: String.raw`'/tmp/end\\'` },
  { name: 'backslash before apostrophe', value: "/tmp/back\\'slash", quoted: String.raw`'/tmp/back\\\'slash'` },
  { name: 'adjacent backslashes', value: '/tmp/two\\\\slashes', quoted: String.raw`'/tmp/two\\\\slashes'` },
  {
    name: 'command-like text',
    value: "/tmp/a\\'; printf PWNED; echo 'b.txt",
    quoted: String.raw`'/tmp/a\\\'; printf PWNED; echo \'b.txt'`,
  },
  {
    name: 'literal metacharacters',
    value: '/tmp/$(printf PWNED) (printf PWNED) $HOME * ? ; | & >.png',
    quoted: "'/tmp/$(printf PWNED) (printf PWNED) $HOME * ? ; | & >.png'",
  },
  { name: 'Unicode', value: '/tmp/O’Brien 🧪.png', quoted: "'/tmp/O’Brien 🧪.png'" },
]
