# 🛡️ PrescriptionZero - Frontend dApp (Web3 Medical Privacy)

PrescriptionZero es el frontend de una aplicación descentralizada (dApp) construida para la red **Midnight Network**. Su propósito es gestionar la emisión, custodia y dispensación de recetas médicas garantizando privacidad absoluta mediante **Pruebas de Conocimiento Nulo (zk-SNARKs)** y la integración nativa con la wallet **Lace**.

Este repositorio contiene la interfaz de usuario (UI), diseñada bajo un estándar **Enterprise / FinTech** (inspirado en plataformas como Stripe, Vercel y Apple Health), asegurando que la extrema complejidad técnica de la criptografía Web3 quede completamente abstraída detrás de una experiencia fluida, intuitiva y de alta confianza.

---

## 🏗️ Filosofía de Diseño y UI/UX

El frontend no utiliza librerías de componentes prefabricados (como Material UI o Bootstrap). En su lugar, se construyó un **Design System propio** utilizando Tailwind CSS para tener control absoluto sobre cada píxel.

*   **Tipografía:** Se utiliza `Inter` para garantizar una legibilidad clínica y jerarquías estrictas (uso de `font-black` para títulos y `text-[10px] uppercase tracking-widest` para micro-etiquetas de metadata).
*   **Glassmorphism & Profundidad:** Uso intensivo de `backdrop-blur-xl`, fondos translúcidos y mallas (*pseudo-grids*) sutiles de fondo para crear jerarquía espacial sin saturar la vista.
*   **Sombras Enterprise:** Reemplazo de las sombras duras tradicionales por sombras multicapa, suaves y difusas (`shadow-enterprise`, `shadow-float`, `shadow-[0_30px_60px_-15px_rgba(0,0,0,0.15)]`).
*   **Microinteracciones:** Transiciones fluidas en *hover* y *active*, anillos de enfoque (`focus-rings`) que reaccionan al input del usuario, y animaciones de latido (`animate-ping`, `animate-pulse`) para indicar estados activos en la red.

---

## 🛠️ Stack Tecnológico Detallado

*   **Core:** React 18 + TypeScript + Vite.
*   **Estilado y Animaciones:** Tailwind CSS (Configuración extendida con paletas semánticas `zinc`, `indigo`, `emerald`, `amber` y `rose`).
*   **Iconografía:** `lucide-react` (SVG icons optimizados).
*   **Web3 & Criptografía:** `@midnight-ntwrk/midnight-js` (Para la firma de transacciones y generación local de pruebas ZK utilizando los circuitos compilados de los Smart Contracts).
*   **Generación de QR (`qrcode`):** Convierte el identificador corto (Hash ZK) en un Data URI (Base64) que se renderiza instantáneamente sin depender de APIs externas.
*   **Escaneo Óptico (`html5-qrcode`):** Motor utilizado para la lectura de la cámara en la terminal POS. Se utiliza la API cruda del motor para evitar inyección de interfaces basura y mantener el diseño personalizado.
*   **Geolocalización In-App:** Uso de la API nativa `navigator.geolocation` combinada con la **Overpass API** (OpenStreetMap) y cálculos matemáticos complejos (Fórmula de Haversine).

---

## 🧠 Arquitectura de Datos y Simulación Web3 (Flujo del Nonce)

Dado que la red ZK requiere aislar los datos sensibles del paciente del registro público (blockchain), el frontend implementa la **"Opción C"** de la arquitectura de la red:

1.  El **Médico** emite la receta. El backend genera un `Commitment` (el hash público de la receta) y un `Nonce` secreto para el paciente.
2.  El frontend del Médico guarda estos datos temporalmente en el `localStorage` (simulando una base de datos local segura E2E).
3.  El **Paciente** conecta su wallet (Lace) y recupera sus recetas.
4.  Cuando el paciente desea ver el QR, el frontend utiliza el `Commitment` y el `Nonce` guardados para invocar el circuito de Lace: `impureCircuits.provePatientOwnership(commitment, nonce)`.
5.  Solo si la prueba criptográfica es exitosa, se emite el token físico (QR).

---

## 📱 Desglose de los Módulos Principales (Explicación Total)

### 1. Portal de Acceso / Home (`/src/pages/Home.tsx`)
Una *Landing Page* técnica diseñada para convertir y educar al usuario sobre la tecnología subyacente.
*   **Hero Section:** Muestra el estado de la red (Mainnet Live), una propuesta de valor clara y un diseño de gradientes holográficos.
*   **Panel de Conexión Lace:** Un componente flotante de alto contraste que simula la negociación con la extensión del navegador de la wallet Lace. 
*   **Enrutador Dinámico:** Contiene un selector interactivo para simular si la wallet que se está conectando pertenece a un Médico, un Paciente o una Farmacia, redirigiendo (`react-router-dom`) a la ruta correspondiente tras un retraso de red simulado (`setTimeout`).

### 2. Panel Clínico del Médico (`/src/pages/Medico.tsx`)
Diseñado como una Estación de Trabajo Clínica (EHR - Electronic Health Record) de grado hospitalario E2E (Extremo a Extremo).
*   **Layout Dividido:** Columna izquierda con información del profesional y estado de sincronización del "Nodo ZK-Rollup". Columna derecha con un formulario ultra-limpio.
*   **Inputs Interactivos (Interactive Blocks):** Los campos de entrada (Identity, Drug, Expiry) no son cajas de texto flotantes, sino bloques contenedores que iluminan sus íconos y bordes al recibir el foco (`focus-within`).
*   **Terminal Criptográfica de Carga:** Al presionar "Sign & Issue", el formulario desaparece y es reemplazado por una terminal oscura (`bg-zinc-950`) que simula, con un efecto de máquina de escribir y *loaders* en cascada, los pasos criptográficos (Cifrado, Generación del Nonce, Empaquetado, Firma).
*   **Recibo Inmutable:** El estado de éxito (`success`) muestra una tarjeta oscura (estilo bloque minado) con el Hash identificador truncado, el Nonce generado y el Commitment público, brindando la sensación de un registro inalterable.

### 3. ZK Wallet del Paciente (`/src/pages/Paciente.tsx`)
La joya de la corona del diseño UI. Un contenedor centrado que emula un dispositivo móvil premium de última generación (`max-w-[440px]`).

**A. Billetera de Prescripciones (Tarjetas Metálicas)**
*   Las recetas médicas abandonan el formato clásico de "papel" y se convierten en **"Metal Cards" criptográficas**.
*   Utilizan fondos oscuros profundos, íconos de farmacia de gran tamaño como marca de agua en baja opacidad, texto holográfico "Rx" y una simulación de un **Chip de Seguridad** (`border-yellow-500/30` con micro-líneas) para darle peso visual al objeto digital.
*   **Generación del Token QR:** Al hacer clic en "Generar ZK Proof", el componente se conecta con Lace. Tras la autorización, el botón se expande y revela el QR.
*   **UX del Token Dinámico (OTP):** El código QR se envuelve en un marco que simula un escáner interno, con un contador regresivo de 5 minutos (formato `MM:SS`) y una advertencia de brillo de pantalla, emulando los tokens dinámicos de las aplicaciones bancarias de más alta seguridad.

**B. Radar ZK (Farmacias Cercanas)**
*   **API Geolocation Nativa:** Solicita permisos de ubicación del navegador de forma segura.
*   **Fetch a Overpass API:** Realiza una consulta `[out:json]` directamente a la base de datos abierta de OpenStreetMap, buscando nodos etiquetados como `amenity="pharmacy"` en un radio de 2000 metros exactos de las coordenadas del usuario.
*   **Fórmula de Haversine:** El frontend implementa esta fórmula trigonométrica para calcular la distancia en línea recta sobre la esfera terrestre entre el dispositivo y cada farmacia recibida, ordenando el array resultante (de más cerca a más lejos) en tiempo real.

### 4. Terminal POS de Farmacia (`/src/pages/Farmacia.tsx`)
Una interfaz en modo oscuro (Dark Mode estricto en la zona de acción) diseñada para emular el software propietario de un hardware de punto de venta (como terminales Square).

**A. El Motor de Escaneo Óptico Puro (`html5-qrcode`)**
*   **Problema resuelto:** La versión con UI (`Html5QrcodeScanner`) deforma la cámara si se aplican estilos Tailwind, ya que inyecta código DOM no deseado.
*   **La Solución:** Se instanció la API pura `new Html5Qrcode("qr-reader")`. Esto permitió forzar el `aspectRatio: 1.0` y el `object-contain` en el contenedor CSS. Esto garantiza que la lente no se deforme (ni en móviles ni en webcams), permitiendo al motor decodificar el cuadrado del QR en milisegundos.
*   **Control del Ciclo de Vida:** Uso avanzado de `useEffect` para iniciar la cámara y, vitalmente, ejecutar `html5QrCode.stop()` inmediatamente tras una lectura exitosa, liberando el hardware de video del usuario y previniendo fugas de memoria o pantallas en negro.
*   **HUD Sci-Fi (Head-Up Display):** El marco de lectura está diseñado con CSS puro. Incluye esquinas de mira (`border-t-4`, `border-amber-500`) y una **línea láser transversal animada** que escanea de arriba a abajo usando un `@keyframes` inyectado.

**B. Validación y Lógica Anti Doble-Gasto**
*   La columna derecha actúa como el "Display del Cliente".
*   Si el QR es válido (coincide con el hash local esperado), la pantalla transiciona a un estado de éxito esmeralda con insignias de "Verificación Criptográfica". El ID se empuja a un array de estado local `usedHistory`.
*   Si la misma receta vuelve a escanearse (intento de fraude / *Double Spending*), el array `usedHistory` atrapa el ID y la pantalla ejecuta una animación de sacudida (`animate-in shake`), el fondo se tiñe de rojo alerta (`rose-600`) y se despliega una tarjeta de aviso crítico ordenando al farmacéutico retener el medicamento.

---

## 🧱 Estructura de Componentes Base (Design System)
Ubicados en `src/components/ui/`, proveen los cimientos visuales de la aplicación, utilizando composición de clases de Tailwind:
*   `Button.tsx`: Motor de botones unificado. Gestiona estados de `isLoading` (inyectando iconos `Loader2` giratorios) y deshabilitando la interacción (`disabled:pointer-events-none`).
*   `Card.tsx`: Contenedores semánticos que aplican la lógica central de *Glassmorphism* (`backdrop-blur-xl`, `bg-white/70`).
*   `Badge.tsx`: Píldoras de información semántica para indicar estados de red ("Online", "Encriptado") con micro-íconos integrados.

---

## 🚀 Instalación y Despliegue Local

1.  **Requisitos Previos:** Node.js (v18+) instalado.
2.  **Clonar y Dependencias:**
    ```bash
    git clone <repository_url>
    cd prescription-zero-frontend
    npm install
    ```
3.  **Configuración Visual (Favicon y Títulos):**
    El archivo `index.html` ha sido configurado para títulos dinámicos SEO-friendly y la inserción de un `logo.svg` en la raíz de la carpeta `/public/`.
4.  **Iniciar Servidor de Desarrollo Rápido (Vite):**
    ```bash
    npm run dev
    ```
    La aplicación se montará en `http://localhost:5173`.

---

## 🔒 Consideraciones de Seguridad Frontend
*   **Zero PII Data in Flight:** Los datos de información personal identificable (PII), como el nombre del paciente, están explícitamente diseñados para permanecer en el estado local del componente (`Medico.tsx`). En los mocks de red, el nombre NUNCA es empaquetado en el payload enviado al "backend".
*   **Abstracción Segura de Hooks:** La integración futura con la wallet Lace a través del hook `@midnight-ntwrk/midnight-js` asegura que el manejo de las claves privadas ocurre estrictamente en la extensión del navegador (o en la bóveda segura del móvil), nunca en el hilo principal de React (Main Thread).