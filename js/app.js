(function () {
  const views = {
    loading: document.getElementById("view-loading"),
    login: document.getElementById("view-login"),
    denied: document.getElementById("view-denied"),
    main: document.getElementById("view-main"),
  };

  const loginForm = document.getElementById("login-form");
  const loginButton = document.getElementById("login-button");
  const loginError = document.getElementById("login-error");
  const mainUser = document.getElementById("main-user");
  const logoutButton = document.getElementById("logout-button");
  const deniedBackButton = document.getElementById("denied-back-button");

  let showingDenied = false;

  function showView(name) {
    Object.keys(views).forEach((key) => {
      views[key].hidden = key !== name;
    });
  }

  function showLoginError(message) {
    loginError.textContent = message;
    loginError.hidden = !message;
  }

  function showLogin(message) {
    showingDenied = false;
    mainUser.textContent = "";
    showLoginError(message || "");
    showView("login");
  }

  async function rejectNonMember() {
    showingDenied = true;
    showView("denied");
    try {
      await Auth.signOut();
    } catch (error) {
      console.error(error);
    }
  }

  async function enterIfMember(user) {
    try {
      const isMember = await Auth.isAppMember(user.id);
      if (!isMember) {
        await rejectNonMember();
        return;
      }
      showingDenied = false;
      mainUser.textContent = user.email || "";
      showView("main");
    } catch (error) {
      console.error(error);
      showingDenied = false;
      try {
        await Auth.signOut();
      } catch (signOutError) {
        console.error(signOutError);
      }
      showLogin("接続を確認してください");
    }
  }

  async function bootFromSession() {
    if (!isSupabaseConfigured()) {
      showLogin("js/config.js に Supabase URL と anon key を設定してください");
      return;
    }

    showView("loading");

    try {
      const session = await Auth.getSession();
      if (!session || !session.user) {
        showLogin();
        return;
      }
      await enterIfMember(session.user);
    } catch (error) {
      console.error(error);
      showLogin("接続を確認してください");
    }
  }

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    showLoginError("");

    if (!isSupabaseConfigured()) {
      showLoginError("js/config.js に Supabase URL と anon key を設定してください");
      return;
    }

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    if (!email || !password) {
      showLoginError("メールアドレスとパスワードを入力してください");
      return;
    }

    loginButton.disabled = true;

    try {
      const { data, error } = await Auth.signIn(email, password);
      if (error || !data.user) {
        console.error(error);
        showLoginError("メールアドレスまたはパスワードを確認してください");
        return;
      }
      await enterIfMember(data.user);
    } catch (error) {
      console.error(error);
      showLoginError("メールアドレスまたはパスワードを確認してください");
    } finally {
      loginButton.disabled = false;
    }
  });

  logoutButton.addEventListener("click", async () => {
    logoutButton.disabled = true;
    try {
      await Auth.signOut();
    } catch (error) {
      console.error(error);
    } finally {
      logoutButton.disabled = false;
      document.getElementById("password").value = "";
      showLogin();
    }
  });

  deniedBackButton.addEventListener("click", () => {
    document.getElementById("password").value = "";
    showLogin();
  });

  supabaseClient.auth.onAuthStateChange((event) => {
    if (showingDenied) {
      return;
    }
    if (event === "SIGNED_OUT") {
      showLogin();
    }
  });

  bootFromSession();
})();
