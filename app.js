
/* SIMTELE-WEB | LOGICA DE LA APLICACION */
"use strict";

/* ALMACENAMIENTO */
const STORAGE = {
    users: "simtele_users_v1",
    maintenance: "simtele_maintenance_v1",
    wind: "simtele_wind_v1",
    sensors: "simtele_sensors_v1",
    emergency: "simtele_emergency_v1"
};

/* USUARIOS INICIALES */
const DEFAULT_USERS = [
    {
        id: 1,
        name: "Administrador General",
        username: "admin",
        email: "admin@simtele.demo",
        password: "admin123",
        role: "Administrador"
    },
    {
        id: 2,
        name: "Operador de Turno",
        username: "operador",
        email: "operador@simtele.demo",
        password: "opera123",
        role: "Operador"
    },
    {
        id: 3,
        name: "Técnico de Mantenimiento",
        username: "tecnico",
        email: "tecnico@simtele.demo",
        password: "tecni123",
        role: "Técnico"
    }
];

/* VARIABLES */
let users = loadData(STORAGE.users, DEFAULT_USERS);
let maintenanceRecords = loadData(STORAGE.maintenance, []);
let windRecords = loadData(STORAGE.wind, []);
let sensorRecords = loadData(STORAGE.sensors, []);
let emergencyRecords = loadData(STORAGE.emergency, []);
let currentUser = null;
let toastTimer;

/* BLOQUEAR ACTUALIZACION DESPUES DE INICIAR SESION */
document.addEventListener("keydown", function(event) {
    if (currentUser !== null) {
        if (
            event.key === "F5" ||
            (event.ctrlKey && event.key.toLowerCase() === "r") ||
            (event.metaKey && event.key.toLowerCase() === "r")
        ) {
            event.preventDefault();
        }
    }
});

/* LEER DATOS */
function loadData(key, fallback) {
    try {
        const stored = localStorage.getItem(key);
        return stored ? JSON.parse(stored) : JSON.parse(JSON.stringify(fallback));
    } catch (error) {
        console.warn("No se pudieron leer los datos locales:", error);
        return JSON.parse(JSON.stringify(fallback));
    }
}

/* GUARDAR DATOS */
function saveData(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
}

/* FECHA */
function formatDate(date = new Date()) {
    return new Intl.DateTimeFormat("es-BO", {
        dateStyle: "short",
        timeStyle: "short"
    }).format(date);
}

/* MENSAJES */
function showToast(message) {
    const toast = document.getElementById("toast");
    toast.textContent = message;
    toast.classList.add("show");

    clearTimeout(toastTimer);

    toastTimer = setTimeout(() => {
        toast.classList.remove("show");
    }, 2600);
}

/* INICIALES */
function initials(name) {
    return name.split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map(part => part[0])
        .join("")
        .toUpperCase();
}

/* MOSTRAR INICIO DE SESION */
function showLogin() {
    document.getElementById("loginView").classList.remove("hidden");
    document.getElementById("registerView").classList.add("hidden");
    document.getElementById("appView").classList.add("hidden");
}

/* MOSTRAR REGISTRO */
function showRegister() {
    document.getElementById("loginView").classList.add("hidden");
    document.getElementById("registerView").classList.remove("hidden");
}

/* PERMISOS */
function hasAccess(section) {
    if (!currentUser) return false;

    const permissions = {
        Administrador: [
            "dashboard",
            "emergency",
            "maintenance",
            "wind",
            "sensors",
            "users"
        ],
        Operador: [
            "dashboard",
            "emergency",
            "wind",
            "sensors"
        ],
        Técnico: [
            "dashboard",
            "maintenance",
            "sensors"
        ]
    };

    return (permissions[currentUser.role] || []).includes(section);
}

/* INICIAR SESION */
function startSession(user) {
    currentUser = user;

    document.getElementById("currentUserName").textContent = user.name;
    document.getElementById("currentUserRole").textContent = user.role.toUpperCase();
    document.getElementById("userAvatar").textContent = initials(user.name);

    document.querySelectorAll(".admin-only").forEach(item => {
        item.classList.toggle("hidden", user.role !== "Administrador");
    });

    document.querySelectorAll(".nav-link").forEach(item => {
        const section = item.dataset.section;
        item.classList.toggle("restricted", !hasAccess(section));
    });

    document.getElementById("loginView").classList.add("hidden");
    document.getElementById("registerView").classList.add("hidden");
    document.getElementById("appView").classList.remove("hidden");

    document.getElementById("todayDate").textContent =
        new Intl.DateTimeFormat("es-BO", {
            dateStyle: "full"
        }).format(new Date());

    refreshDashboard();
    navigateTo("dashboard");
}

/* NAVEGACION */
function navigateTo(section) {
    if (!hasAccess(section)) {
        showToast("Tu perfil no tiene permiso para abrir ese módulo.");
        return;
    }

    document.querySelectorAll(".page-section").forEach(page => {
        page.classList.add("hidden");
    });

    document.getElementById(section + "Section").classList.remove("hidden");

    document.querySelectorAll(".nav-link").forEach(link => {
        link.classList.toggle("active", link.dataset.section === section);
    });

    const activeLink = document.querySelector(
        `.nav-link[data-section="${section}"]`
    );

    document.getElementById("pageName").textContent =
        activeLink ? activeLink.textContent.trim() : "Resumen general";

    document.getElementById("sidebar").classList.remove("open");

    if (section === "dashboard") refreshDashboard();
    if (section === "maintenance") renderMaintenance();
    if (section === "wind") renderWind();
    if (section === "sensors") renderSensors();
    if (section === "emergency") renderEmergency();
    if (section === "users") renderUsers();
}

/* ACTUALIZAR PANEL */
function refreshDashboard() {
    document.getElementById("statMaintenance").textContent = maintenanceRecords.length;

    document.getElementById("statWind").textContent =
        windRecords.reduce((sum, record) => sum + record.values.length, 0);

    document.getElementById("statSensors").textContent = sensorRecords.length;
    document.getElementById("statEmergency").textContent = emergencyRecords.length;

    const activities = [];

    maintenanceRecords.forEach(item => {
        activities.push({
            icon: "⚙",
            title: "Mantenimiento: " + item.component,
            detail: "Estado: " + item.status,
            date: item.date,
            timestamp: item.timestamp
        });
    });

    windRecords.forEach(item => {
        activities.push({
            icon: "≋",
            title: "Análisis de viento",
            detail: "Promedio: " + item.average + " km/h",
            date: item.date,
            timestamp: item.timestamp
        });
    });

    sensorRecords.forEach(item => {
        activities.push({
            icon: "⌁",
            title: "Sensor " + item.code,
            detail: item.type + ": " + item.reading,
            date: item.date,
            timestamp: item.timestamp
        });
    });

    emergencyRecords.forEach(item => {
        activities.push({
            icon: "◉",
            title: "Cálculo de reacción",
            detail: item.distance + " metros estimados",
            date: item.date,
            timestamp: item.timestamp
        });
    });

    activities.sort((a, b) => b.timestamp - a.timestamp);

    const container = document.getElementById("recentActivity");

    container.innerHTML = activities.length
        ? activities.slice(0, 6).map(item => `
            <div class="activity-item">
                <span class="activity-icon">${item.icon}</span>
                <div>
                    <b>${escapeHTML(item.title)}</b>
                    <small>${escapeHTML(item.detail)}</small>
                </div>
                <span class="activity-time">${escapeHTML(item.date)}</span>
            </div>
        `).join("")
        : '<div class="empty-state">Todavía no hay actividad. Ingresa datos en cualquiera de los módulos.</div>';
}

/* PROTEGER TEXTO HTML */
function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);
}

/* MOSTRAR EMERGENCIAS */
function renderEmergency() {
    const body = document.getElementById("emergencyTable");

    document.getElementById("emergencyCount").textContent =
        emergencyRecords.length + " registros";

    body.innerHTML = emergencyRecords.length
        ? emergencyRecords.slice().reverse().map(item => `
            <tr>
                <td>${escapeHTML(item.date)}</td>
                <td>${item.speed} km/h</td>
                <td>${item.reaction} s</td>
                <td><b>${item.distance} m</b></td>
                <td>
                    <span class="status-badge ${item.distance > 50 ? "status-urgent" : "status-normal"}">
                        ${item.distance > 50 ? "Sobre umbral" : "Dentro del umbral"}
                    </span>
                </td>
            </tr>
        `).join("")
        : '<tr><td colspan="5" class="table-empty">No hay cálculos registrados.</td></tr>';
}

/* CALCULAR EMERGENCIA */
function calculateEmergency(event) {
    event.preventDefault();

    const speed = parseFloat(document.getElementById("speed").value);
    const reaction = parseFloat(document.getElementById("reactionTime").value);

    if (
        !Number.isFinite(speed) ||
        !Number.isFinite(reaction) ||
        speed < 0 ||
        speed > 200 ||
        reaction < 0 ||
        reaction > 30
    ) {
        showToast("Verifica los valores: velocidad 0–200 y reacción 0–30.");
        return;
    }

    const distance = (speed / 3.6) * reaction;
    const roundedDistance = Number(distance.toFixed(2));
    const above = distance > 50;

    document.getElementById("distanceResult").textContent = roundedDistance;

    document.getElementById("emergencyStatus").textContent =
        above ? "Atención: supera el umbral" : "Dentro del umbral didáctico";

    document.getElementById("emergencyMessage").textContent = above
        ? "La distancia estimada supera los 50 metros definidos para este ejercicio."
        : "La distancia estimada no supera los 50 metros definidos para este ejercicio.";

    const record = {
        speed,
        reaction,
        distance: roundedDistance,
        date: formatDate(),
        timestamp: Date.now()
    };

    emergencyRecords.push(record);

    saveData(STORAGE.emergency, emergencyRecords);
    renderEmergency();
    refreshDashboard();

    showToast("Cálculo registrado correctamente.");
}

/* MOSTRAR MANTENIMIENTO */
function renderMaintenance() {
    const body = document.getElementById("maintenanceTable");

    document.getElementById("maintenanceCount").textContent =
        maintenanceRecords.length + " registros";

    body.innerHTML = maintenanceRecords.length
        ? maintenanceRecords.map(item => `
            <tr>
                <td><b>${escapeHTML(item.component)}</b></td>
                <td>${item.hours.toLocaleString("es-BO")} h</td>
                <td>
                    <span class="status-badge ${
                        item.status === "Normal"
                            ? "status-normal"
                            : item.status === "Revisión"
                            ? "status-revision"
                            : "status-urgent"
                    }">
                        ${escapeHTML(item.status)}
                    </span>
                </td>
                <td>${escapeHTML(item.date)}</td>
                <td>
                    <button class="delete-btn" data-delete-maintenance="${item.id}">
                        Eliminar
                    </button>
                </td>
            </tr>
        `).join("")
        : '<tr><td colspan="5" class="table-empty">No hay componentes registrados.</td></tr>';
}

/* AGREGAR MANTENIMIENTO */
function addMaintenance(event) {
    event.preventDefault();

    const component = document.getElementById("component").value.trim();
    const hours = Number(document.getElementById("hours").value);
    const status = document.getElementById("maintenanceStatus").value;

    if (
        component.length < 2 ||
        !Number.isFinite(hours) ||
        hours < 0 ||
        hours > 100000 ||
        !status
    ) {
        showToast("Completa los campos con valores válidos.");
        return;
    }

    maintenanceRecords.push({
        id: Date.now(),
        component,
        hours,
        status,
        date: formatDate(),
        timestamp: Date.now()
    });

    saveData(STORAGE.maintenance, maintenanceRecords);

    event.target.reset();

    renderMaintenance();
    refreshDashboard();

    showToast("Componente agregado al inventario.");
}

/* ELIMINAR MANTENIMIENTO */
function deleteMaintenance(id) {
    maintenanceRecords = maintenanceRecords.filter(item => item.id !== id);

    saveData(STORAGE.maintenance, maintenanceRecords);

    renderMaintenance();
    refreshDashboard();

    showToast("Registro eliminado.");
}

/* CLASIFICAR VIENTO */
function classifyWind(average) {
    if (average < 20) {
        return {
            name: "Baja",
            description: "Intensidad baja según el rango ficticio.",
            className: "status-normal"
        };
    }

    if (average < 40) {
        return {
            name: "Moderada",
            description: "Intensidad moderada según el rango ficticio.",
            className: "status-revision"
        };
    }

    return {
        name: "Alta",
        description: "Intensidad alta según el rango ficticio.",
        className: "status-urgent"
    };
}

/* MOSTRAR VIENTO */
function renderWind() {
    const body = document.getElementById("windTable");

    document.getElementById("windCount").textContent =
        windRecords.length + " análisis";

    body.innerHTML = windRecords.length
        ? windRecords.slice().reverse().map(item => `
            <tr>
                <td>${escapeHTML(item.date)}</td>
                <td>${item.values.join(" · ")}</td>
                <td><b>${item.average}</b></td>
                <td><b>${item.maximum}</b></td>
                <td>
                    <span class="status-badge ${
                        item.classification === "Baja"
                            ? "status-normal"
                            : item.classification === "Moderada"
                            ? "status-revision"
                            : "status-urgent"
                    }">
                        ${item.classification}
                    </span>
                </td>
            </tr>
        `).join("")
        : '<tr><td colspan="5" class="table-empty">No hay análisis registrados.</td></tr>';
}

/* ANALIZAR VIENTO */
function analyzeWind(event) {
    event.preventDefault();

    const values = [1, 2, 3, 4, 5].map(number =>
        parseFloat(document.getElementById("wind" + number).value)
    );

    if (values.some(value =>
        !Number.isFinite(value) || value < 0 || value > 200
    )) {
        showToast("Ingresa cinco valores numéricos entre 0 y 200 km/h.");
        return;
    }

    let sum = 0;
    let maximum = values[0];

    values.forEach(value => {
        sum += value;

        if (value > maximum) {
            maximum = value;
        }
    });

    const average = Number((sum / values.length).toFixed(2));
    const classification = classifyWind(average);

    document.getElementById("windAverage").textContent = average;
    document.getElementById("windMaximum").textContent = maximum;
    document.getElementById("windClassification").textContent = classification.name;
    document.getElementById("windDescription").textContent = classification.description;

    windRecords.push({
        values,
        average,
        maximum,
        classification: classification.name,
        date: formatDate(),
        timestamp: Date.now()
    });

    saveData(STORAGE.wind, windRecords);

    renderWind();
    refreshDashboard();

    showToast("Las cinco mediciones fueron analizadas.");
}

/* MOSTRAR SENSORES */
function renderSensors() {
    const body = document.getElementById("sensorTable");

    document.getElementById("sensorCount").textContent =
        sensorRecords.length + " sensores";

    body.innerHTML = sensorRecords.length
        ? sensorRecords.slice().reverse().map(item => `
            <tr>
                <td><b>${escapeHTML(item.code)}</b></td>
                <td>${escapeHTML(item.type)}</td>
                <td>${item.reading}</td>
                <td>${escapeHTML(item.date)}</td>
                <td>
                    <button class="delete-btn" data-delete-sensor="${item.id}">
                        Eliminar
                    </button>
                </td>
            </tr>
        `).join("")
        : '<tr><td colspan="5" class="table-empty">No hay sensores registrados.</td></tr>';
}

/* AGREGAR SENSOR */
function addSensor(event) {
    event.preventDefault();

    const code = document.getElementById("sensorCode").value.trim().toUpperCase();
    const type = document.getElementById("sensorType").value;
    const readingText = document.getElementById("sensorReading").value.trim();
    const reading = Number(readingText);

    const feedback = document.getElementById("sensorFeedback");

    const sensorPattern = /^SEN-\d{3}$/;

    if (!sensorPattern.test(code)) {
        feedback.textContent = "Código inválido. Utiliza el formato SEN-001.";
        feedback.className = "form-feedback full error";
        return;
    }

    if (!type || readingText === "" || !Number.isFinite(reading) || reading < 0 || reading > 100000) {
        feedback.textContent = "Selecciona el tipo e ingresa una lectura válida.";
        feedback.className = "form-feedback full error";
        return;
    }

    if (sensorRecords.some(item => item.code === code)) {
        feedback.textContent = "Ese código ya está registrado. Utiliza otro código.";
        feedback.className = "form-feedback full error";
        return;
    }

    sensorRecords.push({
        id: Date.now(),
        code,
        type,
        reading,
        date: formatDate(),
        timestamp: Date.now()
    });

    saveData(STORAGE.sensors, sensorRecords);

    feedback.textContent = "Sensor validado y guardado correctamente.";
    feedback.className = "form-feedback full success";

    event.target.reset();

    renderSensors();
    refreshDashboard();

    showToast("Lectura del sensor registrada.");
}

/* ELIMINAR SENSOR */
function deleteSensor(id) {
    sensorRecords = sensorRecords.filter(item => item.id !== id);

    saveData(STORAGE.sensors, sensorRecords);

    renderSensors();
    refreshDashboard();

    showToast("Sensor eliminado.");
}

/* MOSTRAR USUARIOS */
function renderUsers() {
    const body = document.getElementById("usersTable");

    document.getElementById("usersCount").textContent =
        users.length + " usuarios";

    body.innerHTML = users.map(user => `
        <tr>
            <td><b>${escapeHTML(user.name)}</b></td>
            <td>${escapeHTML(user.username)}</td>
            <td>${escapeHTML(user.email)}</td>
            <td>
                <span class="status-badge status-normal">
                    ${escapeHTML(user.role)}
                </span>
            </td>
        </tr>
    `).join("");
}

/* FORMULARIO DE INICIO DE SESION */
document.getElementById("loginForm").addEventListener("submit", event => {
    event.preventDefault();

    const username = document.getElementById("loginUser").value.trim().toLowerCase();
    const password = document.getElementById("loginPassword").value;

    const user = users.find(item =>
        item.username.toLowerCase() === username ||
        item.email.toLowerCase() === username
    );

    if (!user || user.password !== password) {
        document.getElementById("loginError").textContent =
            "Usuario o contraseña incorrectos.";
        return;
    }

    document.getElementById("loginError").textContent = "";

    event.target.reset();

    startSession(user);
});

/* BOTONES DE REGISTRO */
document.getElementById("showRegister").addEventListener("click", showRegister);

document.getElementById("backToLogin").addEventListener("click", showLogin);

/* FORMULARIO DE REGISTRO */
document.getElementById("registerForm").addEventListener("submit", event => {
    event.preventDefault();

    const name = document.getElementById("regName").value.trim();
    const username = document.getElementById("regUser").value.trim().toLowerCase();
    const email = document.getElementById("regEmail").value.trim().toLowerCase();
    const password = document.getElementById("regPassword").value;

    const feedback = document.getElementById("registerError");

    if (users.some(user =>
        user.username.toLowerCase() === username ||
        user.email.toLowerCase() === email
    )) {
        feedback.textContent = "Ese usuario o correo ya está registrado.";
        return;
    }

    users.push({
        id: Date.now(),
        name,
        username,
        email,
        password,
        role: "Operador"
    });

    saveData(STORAGE.users, users);

    event.target.reset();

    feedback.textContent = "";

    showLogin();

    showToast("Cuenta creada. Ya puedes iniciar sesión.");
});

/* NAVEGACION DEL MENU */
document.querySelectorAll(".nav-link").forEach(link => {
    link.addEventListener("click", () => {
        navigateTo(link.dataset.section);
    });
});

document.querySelectorAll("[data-go]").forEach(button => {
    button.addEventListener("click", () => {
        navigateTo(button.dataset.go);
    });
});

/* FORMULARIOS DE LOS MODULOS */
document.getElementById("emergencyForm").addEventListener("submit", calculateEmergency);

document.getElementById("maintenanceForm").addEventListener("submit", addMaintenance);

document.getElementById("windForm").addEventListener("submit", analyzeWind);

document.getElementById("sensorForm").addEventListener("submit", addSensor);

/* ELIMINAR MANTENIMIENTO */
document.getElementById("maintenanceTable").addEventListener("click", event => {
    const button = event.target.closest("[data-delete-maintenance]");

    if (button) {
        deleteMaintenance(Number(button.dataset.deleteMaintenance));
    }
});

/* ELIMINAR SENSORES */
document.getElementById("sensorTable").addEventListener("click", event => {
    const button = event.target.closest("[data-delete-sensor]");

    if (button) {
        deleteSensor(Number(button.dataset.deleteSensor));
    }
});

/* CERRAR SESION */
document.getElementById("logoutBtn").addEventListener("click", () => {
    currentUser = null;

    document.getElementById("sidebar").classList.remove("open");

    showLogin();

    showToast("Sesión cerrada.");
});

/* ABRIR MENU */
document.getElementById("menuToggle").addEventListener("click", () => {
    document.getElementById("sidebar").classList.toggle("open");
});
