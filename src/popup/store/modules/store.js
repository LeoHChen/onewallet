import {getAccounts} from "../../../lib/keystore";

export default {
  namespaced: true,

  state: {
    loading: true,
    accounts: []
  },

  actions: {
    async fetchAccounts({ commit }) {
      const accounts = await getAccounts();
      console.log("store.js fetchAccounts:", accounts)
      
      commit('setAccounts', accounts);
      commit('setLoading', false);
    },
    async addAccount({ commit }, account) {
      commit('addAccount', account);
    }
  },

  mutations: {
    addAccount(state, payload) {
      state.accounts.push(payload);
    },
    setAccounts(state, payload) {
      state.accounts = payload;
    },
    setLoading(state, payload) {
      state.loading = payload;
    }
  },
};
