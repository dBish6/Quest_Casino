export interface LocaleEntry {
  success: { [key: string]: any };
  error: { [key: string]: any };
  [key: string]: any;
};

export interface LocaleData {
  auth: LocaleEntry;
  chat: LocaleEntry;
  game: LocaleEntry;
  notifs: {
    [category: string]: {
      [key: string]: { title: string; message: string };
    };
  };
  general: LocaleEntry;
};
