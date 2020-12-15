import gql from "graphql-tag";

export const state = () => ({
    setting: null,
    authUser: null,
})

export const mutations = {
    SET_SETTING(state, setting) {
        state.setting = setting;
    },
    SET_USER(state, user) {
        state.authUser = user;
    },
}

export const actions = {
    async nuxtServerInit({ commit }, { req, app }) {
        const client = app.apolloProvider.defaultClient;
        const user = req.user;
        if(user) {
            commit('SET_USER', {
                id: req.user.id,
                isAdmin: req.user.isAdmin,
                name: req.user.name
            })
        }
    },
    async signup({ commit }, { email, password, name, code }) {
        const client = this.app.apolloProvider.defaultClient;
        try {
            const response = await client.mutate({
                mutation: gql`
                    mutation signup($email: String!, $password: String!, $name: String!, $code: String!) {
                        createUserByCode(email: $email, password: $password, name: $name, code: $code) {
                            id,
                            name,
                        }
                    }
                `,
                variables: {
                    email, password, name, code
                },
                fetchPolicy: 'no-cache',
            });
            const loginres = await client.mutate({
                mutation: gql`
                     mutation signin($email: String, $password: String) {
                         authenticateUserWithPassword(email: $email, password: $password) {
                             item {
                                id,
                                name,
                                isAdmin
                             }
                             token
                         }
                     }`,
                variables: { email, password },
                fetchPolicy: 'no-cache',
              }
            );
            await client.resetStore();
            const authenticateUserWithPassword = loginres.data.authenticateUserWithPassword;
            if (authenticateUserWithPassword && authenticateUserWithPassword.item) {
                commit('SET_USER', authenticateUserWithPassword.item)
                await this.$apolloHelpers.onLogin(authenticateUserWithPassword.token)
            }
        } catch (error) {
            throw error;
        }
    },
    async login({ commit }, { email, password }) {
        const client = this.app.apolloProvider.defaultClient;
        try {
            const response = await client.mutate({
                mutation: gql`
                 mutation signin($email: String, $password: String) {
                     authenticateUserWithPassword(email: $email, password: $password) {
                         item {
                            id,
                            name,
                            isAdmin
                         }
                         token
                     }
                 }`,
                variables: { email, password },
                fetchPolicy: 'no-cache',
            }
            )
            await client.resetStore();
            const authenticateUserWithPassword = response.data.authenticateUserWithPassword;
            if (authenticateUserWithPassword && authenticateUserWithPassword.item) {
                commit('SET_USER', authenticateUserWithPassword.item)
                await this.$apolloHelpers.onLogin(authenticateUserWithPassword.token);
            }
        } catch (error) {
            throw error;
        }
    },
    async signout({ commit }) {
        const client = this.app.apolloProvider.defaultClient;
        try {
            const response = await client.mutate({
                mutation: gql`
                    mutation {
                        unauthenticateUser {
                            success
                        }
                    }
                `,
                fetchPolicy: 'no-cache',
            })
            const unauthenticateUser = response.data.unauthenticateUser;
            if (unauthenticateUser && unauthenticateUser.success) {
                commit("SET_USER", null);
                await this.$apolloHelpers.onLogout();
            }
        } catch (error) {
            throw error;
        }
    }
}