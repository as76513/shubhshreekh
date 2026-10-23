// Package billing holds the switch for paid access.
//
// PaymentsEnabled stays false until January 2027. The trial check, the
// complimentary-continue path, and the pricing API all stay in the tree.
// Set this to true when Razorpay and Play Billing are turned on. The
// matching frontend switch is src/lib/payments.ts.
package billing

// PaymentsEnabled gates the post-trial login lock. While false, a finished
// trial still receives a session. Device limits are unchanged.
var PaymentsEnabled = false
