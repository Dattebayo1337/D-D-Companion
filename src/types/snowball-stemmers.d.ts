declare module "snowball-stemmers" {
  export function newStemmer(language: "russian" | "english"): {
    stem(word: string): string;
  };
}
