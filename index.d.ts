interface Point {
  line: number;
  column: number;
  offset: number;
}
interface ASTNode {
  type: string;
  value: string;
  children?: ASTNode[]
  position: Point;
}
declare function parser(commitText: string): ASTNode;
interface ConventionalChangelogCommit {
  type: string;
  scope: string | null;
  subject: string;
  merge: boolean | null;
  header: string;
  body: string | null;
  footer: string | null;
  notes: Note[];
  references: object[];
  mentions: string[];
  revert: boolean | null;
}
declare function toConventionalChangelogFormat(ast: ASTNode): ConventionalChangelogCommit;
export {
  parser,
  toConventionalChangelogFormat
}
