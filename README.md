## 🚀🚀 Active Development
The development of the complete overhaul of Quest Casino is now underway, and the first official version of Quest Casino version 2 is now live, but due to a huge change, I have chosen to stop the server for questcasino.org. View the [Current Steps section](#current-steps) for more info. Quest Casino version 2 is a highly ambitious upgrade that promises to surpass its predecessor in every way. Stay Tuned! 🎰

# Quest_Casino_Full-Stack_App
This is a fun casino app that has different kinds of casino games. From the sound of the name, in addition, it has some quests/challenges to complete for some extra moolah!

## New Tech Stack
Quest Casino has transitioned to a `monoRepo`, which is very scalable. This setup allows for potential expansions into mobile development and additional web apps. Also, this allows for the API to communicate with the front-end via proxy which can provide better performance. This monoRepo uses `npm` and `turboRepo` as the build system.

### web
The `web` directory is a `TypeSript React` app which uses `Vite` and a custom `SSR server` for SEO, `Framer Motion` for dynamic animations, `Redux` for state management, `Storybook` for testing and component management with the help from `Class Variance Authority` for variants and `Radix UI` here and there to ensure accessibility and other benefits. `PostCSS` and `CSS modules` handles styling.

### serverCore
The `serverCore` directory contains the core API and WebSocket connections via `socket.io`, developed using `TypeScript Express`. I also finally decided to remove Firebase, mid-development. I felt that all I really needed from Firebase was Firestore and all the additional features felt like unnecessary 'bloat' and also the 'hand-holding' began to annoy me. So, after I made up this tech stack, I decided to remove Firebase and use a different document-oriented database, `MongoDB`. Our database is now MongoDB complemented with an Object Data Modeling (ODM) tool, `Mongoose`, for a structured schema approach.

## Current Steps
The first v1.0.0 version of Quest Casino v2 is now live, but currently, the server is down due to a huge change I want to make. I am localizing the app and it will change the URL, so I don't want bots indexing at this time and I just feel like it's more ready after this time. So, <b>questcasino.org is down due to development</b>.

## Collaboration Appreciated!
I would love to work with other people with this app I envisioned.

When collaborating, you don't have to help with the main UI, I am also looking for people to make some games for Quest Casino. So, if you think of a cool Casino game to be featured, go right ahead. You could use JavaScript with preferably TypeScript and no React if you really want to, but other games are using React.

To collaborate just shoot me an [email](mailto:davidbish2002@hotmail.com) or you can contact me on [Linkedin](https://www.linkedin.com/in/d-bish/).

If you want to know more about Quest Casino, take a look at the design case study. Quest Casino's UI has undergone rigorous design and UX testing to ensure a great user experience, the design case study for the new version is on my portfolio website or just use this [link](https://docs.google.com/presentation/d/1cegjwMxQvDhePSHiwVTRRgHZQYwQCqj3NcJFy1GPhMk/edit?usp=sharing). You'll find it at [https://www.davidbishop.info/#design](https://www.davidbishop.info/#design) on my portfolio.

### Prerequisites
- `Nodejs` version 20 or greater.
- `NPM` version 10 or greater.

### Getting Started
```
$ npm install
$ npm run dev
```
- Running `npm run dev` would run every project in the repo. If you want to run a specific project, use the --workspace flag. The _\<project\>_ would be the name in the package.json of a project.
```
$ npm run dev --workspace <project>
```
- When `installing a package`, don't forget to install it for a specific project:
```
$ npm install <package> --workspace <project>
```

## Directory Structure
...

## Thanks!
I hope my work can inspire you, thank you for your interest in the app!

<a href="https://www.buymeacoffee.com/dBish" target="_blank"><img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me A Coffee" style="height: 60px !important;width: 217px !important;" ></a>

<br />

---
Shield: [![CC BY 4.0][cc-by-shield]][cc-by]

This work is licensed under a
[Creative Commons Attribution 4.0 International License][cc-by].

[![CC BY 4.0][cc-by-image]][cc-by]

[cc-by]: http://creativecommons.org/licenses/by/4.0/
[cc-by-image]: https://i.creativecommons.org/l/by/4.0/88x31.png
[cc-by-shield]: https://img.shields.io/badge/License-CC%20BY%204.0-lightgrey.svg
