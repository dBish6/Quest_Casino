export interface LocaleInitialization {
  type: string;
  data: LocaleData;
}

/**
 * Makers like "{}" are used for server data or something else that needs to be inserted in that place.
 * This is similar to i18next, but they do not do not do single, {}. i18next is never needed, it's a
 * useless package and that's why I don't use it.
 * - {{}} - Will NOT be translated.
 * - {} - Will BE translated.
 */

export interface LocaleMeta {
  title: string;
  tags: { name: string; content: string }[];
}

/**
 * Developer-Friendly Version
 * 
 * Most types were stripped due to how annoying they are in practice.
 * 
 * The 'realistic' version is shown below:
 * ```ts
 * interface LocaleEntry {
 *   title?: string | string[];
 *   para?: string | string[];
 *   aria?: {
 *     alt?: Record<string, string | string[]>;
 *     title?: Record<string, string | string[]>;
 *     label?: Record<string, string | string[]>;
 *     descrip?: Record<string, string | string[]>;
 *   };
 *   [key: string]: string | string[];
 * }
 * ```
 */
export interface LocaleEntry {
  title: any;
  para: any;
  /**
   * Alts for images, aria-labels, title props...
   */
  aria: {
    alt: any;
    title: any;
    label: any;
    descrip: any;
  };

  form: {
    [key: string]: any;
    error: {
      // [key: string]: string | string[];
      [key: string]: any;
    }
  }

  [key: string]: any;
}

/**
 * Developer-Friendly Version
 * 
 * Can be just `title` and `para` directly, or key-value pairs that follow the `LocaleEntry` structure.
 * 
 * Most types were stripped due to how annoying they are in practice, the 'realistic' version is shown below:
 * ```ts
 * interface LocaleContent extends LocaleEntry {
 *   section?: Record<string, LocaleEntry & { sub?: Record<string, LocaleEntry> }>;
 *   [key: string]: string | string[] | LocaleEntry;
 * }
 * ```
 */
export interface LocaleContent extends LocaleEntry {
  section: {
    [name: string]: LocaleEntry & {
      sub: {
        [name: string]: LocaleEntry;
      };
    };
  };
  [key: string]: any;
}

export interface LocaleData {
  page: {
    [path: string]: {
      meta: LocaleMeta;
      content: LocaleContent;
    };
  };
  component: {
    [component: string]: LocaleContent;
  };
  api: {
    // TODO: Not sure yet.
    message: {
      [route: string]: { [key: string]: any };
    };
    action: {
      [action: string]: { [key: string]: any };
    };
  };
  general: {
    noResults: string;
    loginRequired: string;
    refresh: string;
    results: string;
    submit: string;
    update: string;
    unauthorized: string;
    form: {
      user: {
        firstName: string;
        lastName: string;
        email: string;
        username: string;
        password: string;
        confirmPassword: string;
        country: string;
        region: string;
        callingCode: string;
        phoneNumber: string;
        error: {
          required: string;
        }
      }
    },
  };
  aria: {
    label: {
      logoTitle: string;
    }
  }
}
