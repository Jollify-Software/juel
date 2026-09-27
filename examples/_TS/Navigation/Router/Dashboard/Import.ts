// Views for examples/Navigation/Router/dashboard.html — the mock admin app
// that shows the router being the whole page rather than one demo among many.
//
// dash-reports isn't here: it's dashboard-reports.js next to the page, loaded
// by the router's module="…" route, so it must stay out of example.js.
import './DashOverview';
import './DashCustomerList';
import './DashCustomerDetail';
import './DashOrderList';
import './DashOrderDetail';
import './DashSettings';
import './DashLogin';
import './DashNotFound';

export { requireSignIn, signedInAs, signOut } from './auth';
