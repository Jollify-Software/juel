// Views for examples/Navigation/Router/router.html.
//
// demo-report isn't here: it's lazy-report.js next to the page, a standalone
// module the router fetches at runtime to demonstrate module="…" routes, so it
// must stay out of example.js.
import './DemoHome';
import './DemoUserList';
import './DemoUserDetail';
import './DemoFileBrowser';
import './DemoCatchAll';
import './DemoAdmin';
import './DemoLogin';
import './DemoSettings';
import './DemoNotFound';
import { defineDemoChart } from './DemoChart';
import { requireSignIn, signedInAs, signOut } from './Dashboard/Import';

export const routerExamples = {
    defineDemoChart,
    // dashboard.html's shell script reaches these for the sign-in guard.
    dashboard: { requireSignIn, signedInAs, signOut },
};
