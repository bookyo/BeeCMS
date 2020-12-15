export default function ({ store, redirect }) {
    if (!store.state.authUser) {
        return redirect("/")
    } else {
        if (!store.state.authUser.isAdmin) {
            return redirect("/")
        }
    }
}