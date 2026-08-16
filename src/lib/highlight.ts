/**
 * highlight.ts — dependency-free syntax highlighter.
 *
 * Returns an HTML string (one <span class="block"> per line, tokens
 * wrapped in <span class="syn-*">). Tokens are styled via CSS variables:
 * --syn-keyword, --syn-string, --syn-comment, --syn-number, --syn-type,
 * --syn-fn, --syn-punct, --syn-plain.
 *
 * Supported languages: csharp, sql, typescript, javascript, go, bash,
 * rust, python, markdown, json, yaml. Falls back to plain for unknown.
 *
 * The tokenizer is intentionally simple — a single multiline regex
 * sweep with priority: comment > string > number > keyword/type/fn >
 * punctuation > plain. Good enough for case-study snippets; not a real
 * parser. Runs at build time only (zero client JS cost).
 */

export type Token = {
  type:
    | "comment"
    | "string"
    | "number"
    | "keyword"
    | "type"
    | "fn"
    | "punct"
    | "plain";
  value: string;
};

/* ── language tables ────────────────────────────────────────────────── */

const KEYWORDS: Record<string, string[]> = {
  csharp: [
    "abstract","as","async","await","base","bool","break","byte","case","catch","char","checked","class","const","continue","decimal","default","delegate","do","double","else","enum","event","explicit","extern","false","finally","fixed","float","for","foreach","get","goto","if","implicit","in","int","interface","internal","is","lock","long","namespace","new","null","object","operator","out","override","params","private","protected","public","readonly","ref","return","sbyte","sealed","set","short","sizeof","stackalloc","static","string","struct","switch","this","throw","true","try","typeof","uint","ulong","unchecked","unsafe","ushort","using","var","virtual","void","volatile","while","yield",
  ],
  typescript: [
    "abstract","any","as","async","await","boolean","break","case","catch","class","const","continue","debugger","declare","default","delete","do","else","enum","export","extends","false","finally","for","from","function","get","if","implements","import","in","instanceof","interface","is","keyof","let","namespace","never","new","null","number","object","of","private","protected","public","readonly","return","satisfies","set","static","string","super","switch","symbol","this","throw","true","try","type","typeof","undefined","unknown","var","void","while","yield",
  ],
  javascript: [
    "async","await","break","case","catch","class","const","continue","debugger","default","delete","do","else","export","extends","false","finally","for","function","from","get","if","implements","import","in","instanceof","interface","let","new","null","of","return","set","static","super","switch","this","throw","true","try","typeof","var","void","while","yield","undefined",
  ],
  go: [
    "break","case","chan","const","continue","default","defer","else","fallthrough","for","func","go","goto","if","import","interface","map","package","range","return","select","struct","switch","type","var","true","false","nil","iota",
  ],
  rust: [
    "as","async","await","break","const","continue","crate","dyn","else","enum","extern","false","fn","for","if","impl","in","let","loop","match","mod","move","mut","pub","ref","return","self","Self","static","struct","super","trait","true","type","unsafe","use","where","while","yield",
  ],
  python: [
    "False","None","True","and","as","assert","async","await","break","class","continue","def","del","elif","else","except","finally","for","from","global","if","import","in","is","lambda","nonlocal","not","or","pass","raise","return","try","while","with","yield",
  ],
  sql: [
    "select","from","where","insert","into","values","update","set","delete","create","table","alter","drop","index","view","join","left","right","inner","outer","full","on","group","by","having","order","asc","desc","limit","offset","distinct","union","all","as","case","when","then","else","end","and","or","not","null","is","in","between","like","exists","primary","key","foreign","references","default","unique","constraint","check","cascade","truncate","begin","commit","rollback","transaction","if","exists","with","recursive","returning","over","partition","window",
  ],
  bash: [
    "if","then","else","elif","fi","for","do","done","while","case","esac","in","function","return","local","export","unset","echo","printf","read","cd","pwd","ls","cat","grep","sed","awk","curl","wget","ssh","sudo","apt","brew","npm","bun","yarn","pnpm","git","docker","kubectl",
  ],
  json: ["true","false","null"],
  yaml: ["true","false","null","yes","no","on","off"],
};

const TYPES: Record<string, string[]> = {
  csharp: [
    "bool","byte","char","decimal","double","float","int","long","object","sbyte","short","string","uint","ulong","ushort","void","Task","IEnumerable","List","Dictionary","HashSet","Array","Tuple","ValueTask","IQueryable","ICollection","IList","IDictionary",
  ],
  typescript: [
    "string","number","boolean","void","never","unknown","any","object","symbol","bigint","Array","Promise","Record","Partial","Required","Readonly","Pick","Omit","Map","Set","Date","Error","RegExp","Function",
  ],
  javascript: ["Array","Promise","Map","Set","Date","Error","RegExp","Function","Object","Number","String","Boolean","Symbol","BigInt"],
  go: [
    "int","int8","int16","int32","int64","uint","uint8","uint16","uint32","uint64","float32","float64","string","bool","byte","rune","error","interface","struct","map","chan","func","any","complex64","complex128",
  ],
  rust: [
    "i8","i16","i32","i64","i128","u8","u16","u32","u64","u128","f32","f64","bool","char","str","String","Vec","Option","Result","Box","Rc","Arc","HashMap","HashSet","BTreeMap","BTreeSet",
  ],
  python: ["int","float","str","bool","list","dict","set","tuple","bytes","bytearray","NoneType","complex"],
  sql: [
    "INT","INTEGER","BIGINT","SMALLINT","TINYINT","DECIMAL","NUMERIC","FLOAT","REAL","DOUBLE","CHAR","VARCHAR","TEXT","NCHAR","NVARCHAR","NTEXT","DATE","TIME","DATETIME","TIMESTAMP","BOOLEAN","BLOB","JSON","JSONB","UUID","SERIAL","BIGSERIAL",
  ],
  bash: [],
  json: [],
  yaml: [],
};

const COMMENT: Record<string, [string | null, string | null]> = {
  csharp: ["//", "/* */"],
  typescript: ["//", "/* */"],
  javascript: ["//", "/* */"],
  go: ["//", "/* */"],
  rust: ["//", "/* */"],
  python: ["#", '""" """'],
  sql: ["--", "/* */"],
  bash: ["#", null],
  json: [null, null],
  yaml: ["#", null],
  markdown: [null, null],
};

/* ── helpers ────────────────────────────────────────────────────────── */

function normalize(lang: string): string {
  const l = lang.toLowerCase();
  if (l === "c#" || l === "csharp" || l === "cs") return "csharp";
  if (l === "ts" || l === "tsx" || l === "typescript") return "typescript";
  if (l === "js" || l === "jsx" || l === "javascript") return "javascript";
  if (l === "golang") return "go";
  if (l === "rs") return "rust";
  if (l === "py") return "python";
  if (l === "sh" || l === "shell" || l === "zsh" || l === "bash") return "bash";
  if (l === "yml") return "yaml";
  return l;
}

function isIdentChar(c: string): boolean {
  return /[A-Za-z0-9_@$#]/.test(c);
}

function escapeHtml(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

/**
 * tokenizeLine — sweep a single line into tokens.
 * Order of precedence: comment > string > number > identifier (kw/type/fn) >
 * punctuation > plain.
 */
function tokenizeLine(line: string, lang: string): Token[] {
  const tokens: Token[] = [];
  const kw = KEYWORDS[lang];
  const ty = TYPES[lang];
  const [lineComment] = COMMENT[lang] || [null, null];

  let i = 0;
  while (i < line.length) {
    const rest = line.slice(i);
    const c = line[i];

    /* line comment */
    if (lineComment && rest.startsWith(lineComment)) {
      tokens.push({ type: "comment", value: rest });
      i = line.length;
      break;
    }

    /* strings: ", ', ` (block comment markers in the table are unused —
       snippets are tokenized line-by-line, matching the original) */
    if (c === '"' || c === "'" || c === "`") {
      const quote = c;
      let j = i + 1;
      while (j < line.length) {
        if (line[j] === "\\") {
          j += 2;
          continue;
        }
        if (line[j] === quote) {
          j++;
          break;
        }
        j++;
      }
      tokens.push({ type: "string", value: line.slice(i, j) });
      i = j;
      continue;
    }

    /* numbers (with decimals, hex, exponents) */
    if (/[0-9]/.test(c) || (c === "." && /[0-9]/.test(line[i + 1] || ""))) {
      const m = rest.match(/^(0x[0-9A-Fa-f]+|0o[0-7]+|0b[01]+|\d+\.?\d*(?:e[+-]?\d+)?)/i);
      if (m) {
        tokens.push({ type: "number", value: m[0] });
        i += m[0].length;
        continue;
      }
    }

    /* identifiers / keywords / types / function calls */
    if (isIdentChar(c)) {
      const m = rest.match(/^[A-Za-z_@$][A-Za-z0-9_]*/);
      if (m) {
        const word = m[0];
        const afterIdx = i + word.length;
        const afterChar = line[afterIdx];
        let type: Token["type"] = "plain";
        if (kw?.includes(word)) type = "keyword";
        else if (ty?.includes(word)) type = "type";
        else if (afterChar === "(") type = "fn";
        tokens.push({ type, value: word });
        i += word.length;
        continue;
      }
    }

    /* punctuation cluster */
    if (/[{}()\[\].,;:?!=+\-*/%<>&|^~]/.test(c)) {
      const m = rest.match(/^[{}()\[\].,;:?!=+\-*/%<>&|^~]+/);
      if (m) {
        tokens.push({ type: "punct", value: m[0] });
        i += m[0].length;
        continue;
      }
    }

    /* plain (whitespace + anything else) */
    const m = rest.match(/^[ \t]+/);
    if (m) {
      tokens.push({ type: "plain", value: m[0] });
      i += m[0].length;
      continue;
    }
    tokens.push({ type: "plain", value: c });
    i++;
  }
  return tokens;
}

/**
 * highlightCode — split code into lines, tokenize each, and return an
 * HTML string: one <span class="block"> per line so line numbers can
 * align in a separate gutter. Values are HTML-escaped.
 */
export function highlightCode(code: string, language: string): string {
  const lang = normalize(language);
  const lines = code.replace(/\n$/, "").split("\n");
  return lines
    .map((line) => {
      const inner = tokenizeLine(line, lang)
        .map((t) =>
          t.type === "plain"
            ? escapeHtml(t.value)
            : `<span class="syn-${t.type}">${escapeHtml(t.value)}</span>`
        )
        .join("");
      // zero-width space keeps empty lines from collapsing (as in the
      // React version, which rendered {"\u200b"} on empty lines)
      const body = line.length === 0 ? "\u200b" : inner;
      return `<span class="block">${body}</span>`;
    })
    .join("");
}
