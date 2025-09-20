<script lang="ts">
	import { page } from '$app/stores';

	$: status = $page.status;
	$: message = $page.error?.message || 'An unexpected error occurred';

	function getErrorIcon(status: number): string {
		switch (status) {
			case 404:
				return '🚫';
			case 500:
				return '💥';
			case 403:
				return '🔐';
			default:
				return '⚠️';
		}
	}

	function getErrorTitle(status: number): string {
		switch (status) {
			case 404:
				return 'Resource Not Found';
			case 500:
				return 'Server Malfunction';
			case 403:
				return 'Access Denied';
			default:
				return 'System Error';
		}
	}

	function getErrorDescription(status: number): string {
		switch (status) {
			case 404:
				return 'The requested asset could not be located in our systems.';
			case 500:
				return 'Our mainframe has encountered a critical error.';
			case 403:
				return 'Insufficient clearance level for this operation.';
			default:
				return 'An anomaly has been detected in the system matrix.';
		}
	}
</script>

<div class="error-container">
	<div class="error-content">
		<!-- Animated background elements -->
		<div class="error-grid"></div>
		<div class="error-scan-line"></div>

		<!-- Main error display -->
		<div class="error-display">
			<div class="error-icon">
				{getErrorIcon(status)}
			</div>

			<div class="error-code">
				ERROR {status}
			</div>

			<h1 class="error-title">
				{getErrorTitle(status)}
			</h1>

			<p class="error-description">
				{getErrorDescription(status)}
			</p>

			<div class="error-message">
				<div class="terminal-label">DIAGNOSTIC:</div>
				<div class="terminal-output">{message}</div>
			</div>

			<div class="error-actions">
				<button
					on:click={() => window.history.back()}
					class="action-btn primary"
				>
					← Return to Previous Location
				</button>

				<a href="/" class="action-btn secondary">
					🏠 Return to Base
				</a>

				<button
					on:click={() => window.location.reload()}
					class="action-btn tertiary"
				>
					🔄 Reinitialize System
				</button>
			</div>
		</div>

		<!-- Decorative elements -->
		<div class="error-decorations">
			<div class="deco-line deco-line-1"></div>
			<div class="deco-line deco-line-2"></div>
			<div class="deco-line deco-line-3"></div>
		</div>
	</div>
</div>

<style>
@import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Share+Tech+Mono&display=swap');

:global(body) {
	font-family: 'Orbitron', monospace;
	background: #020617;
	overflow-x: hidden;
}

.error-container {
	min-height: 100vh;
	display: flex;
	align-items: center;
	justify-content: center;
	background: #020617;
	color: #e2e8f0;
	position: relative;
	padding: 2rem;
}

.error-container::before {
	content: '';
	position: fixed;
	top: 0;
	left: 0;
	width: 100%;
	height: 100%;
	background:
		linear-gradient(rgba(6, 182, 212, 0.05) 1px, transparent 1px),
		linear-gradient(90deg, rgba(6, 182, 212, 0.05) 1px, transparent 1px),
		linear-gradient(135deg, #020617 0%, #0f172a 50%, #1e293b 100%);
	background-size: 40px 40px, 40px 40px, 100% 100%;
	pointer-events: none;
	z-index: -1;
}

.error-content {
	max-width: 800px;
	width: 100%;
	position: relative;
	text-align: center;
}

.error-grid {
	position: absolute;
	top: -50%;
	left: -50%;
	width: 200%;
	height: 200%;
	background:
		linear-gradient(rgba(220, 38, 127, 0.1) 1px, transparent 1px),
		linear-gradient(90deg, rgba(220, 38, 127, 0.1) 1px, transparent 1px);
	background-size: 60px 60px;
	animation: grid-drift 20s linear infinite;
	pointer-events: none;
}

.error-scan-line {
	position: absolute;
	top: 0;
	left: -100%;
	width: 200%;
	height: 2px;
	background: linear-gradient(90deg, transparent, #dc2626, transparent);
	animation: scan-line 3s linear infinite;
	z-index: 1;
	pointer-events: none;
}

.error-display {
	background: rgba(15, 23, 42, 0.8);
	backdrop-filter: blur(20px);
	border: 2px solid rgba(220, 38, 127, 0.3);
	border-radius: 1rem;
	padding: 3rem 2rem;
	position: relative;
	z-index: 2;
	box-shadow:
		0 0 40px rgba(220, 38, 127, 0.2),
		inset 0 0 40px rgba(220, 38, 127, 0.05);
}

.error-display::before {
	content: '';
	position: absolute;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	background: radial-gradient(ellipse at center, rgba(220, 38, 127, 0.1), transparent 70%);
	border-radius: 1rem;
	pointer-events: none;
}

.error-icon {
	font-size: 4rem;
	margin-bottom: 1rem;
	filter: drop-shadow(0 0 20px #dc2626);
	animation: pulse-glow 2s ease-in-out infinite alternate;
}

.error-code {
	font-family: 'Share Tech Mono', monospace;
	font-size: 1.5rem;
	color: #dc2626;
	font-weight: 700;
	text-shadow: 0 0 10px #dc2626;
	margin-bottom: 1rem;
	animation: flicker 3s infinite linear;
}

.error-title {
	font-size: 2.5rem;
	font-weight: 900;
	font-family: 'Orbitron', monospace;
	text-shadow: 0 0 10px #06b6d4, 0 0 20px #06b6d4;
	color: #f0f9ff;
	margin: 0 0 1.5rem 0;
	animation: glow 2s ease-in-out infinite alternate;
}

.error-description {
	font-size: 1.2rem;
	opacity: 0.9;
	color: #06b6d4;
	margin-bottom: 2rem;
	text-shadow: 0 0 5px #06b6d4;
}

.error-message {
	background: rgba(0, 0, 0, 0.5);
	border: 1px solid rgba(220, 38, 127, 0.5);
	border-radius: 0.5rem;
	padding: 1rem;
	margin-bottom: 2rem;
	font-family: 'Share Tech Mono', monospace;
	text-align: left;
}

.terminal-label {
	color: #22d3ee;
	font-size: 0.875rem;
	margin-bottom: 0.5rem;
	text-transform: uppercase;
	letter-spacing: 0.1em;
}

.terminal-output {
	color: #f87171;
	font-size: 0.9rem;
	word-break: break-word;
}

.error-actions {
	display: flex;
	flex-wrap: wrap;
	gap: 1rem;
	justify-content: center;
	margin-top: 2rem;
}

.action-btn {
	background: rgba(6, 182, 212, 0.2);
	color: #06b6d4;
	border: 2px solid rgba(6, 182, 212, 0.3);
	padding: 0.75rem 1.5rem;
	border-radius: 0.75rem;
	cursor: pointer;
	font-size: 1rem;
	font-family: 'Orbitron', monospace;
	font-weight: 600;
	text-shadow: 0 0 5px #06b6d4;
	transition: all 0.3s ease;
	position: relative;
	overflow: hidden;
	text-decoration: none;
	display: inline-flex;
	align-items: center;
	gap: 0.5rem;
}

.action-btn.primary {
	background: rgba(168, 85, 247, 0.2);
	color: #a855f7;
	border-color: rgba(168, 85, 247, 0.3);
	text-shadow: 0 0 5px #a855f7;
}

.action-btn.secondary {
	background: rgba(34, 197, 94, 0.2);
	color: #22c55e;
	border-color: rgba(34, 197, 94, 0.3);
	text-shadow: 0 0 5px #22c55e;
}

.action-btn.tertiary {
	background: rgba(234, 179, 8, 0.2);
	color: #eab308;
	border-color: rgba(234, 179, 8, 0.3);
	text-shadow: 0 0 5px #eab308;
}

.action-btn:hover {
	transform: translateY(-2px);
	box-shadow: 0 0 20px rgba(6, 182, 212, 0.4);
}

.action-btn.primary:hover {
	box-shadow: 0 0 20px rgba(168, 85, 247, 0.4);
}

.action-btn.secondary:hover {
	box-shadow: 0 0 20px rgba(34, 197, 94, 0.4);
}

.action-btn.tertiary:hover {
	box-shadow: 0 0 20px rgba(234, 179, 8, 0.4);
}

.action-btn::before {
	content: '';
	position: absolute;
	top: 0;
	left: -100%;
	width: 100%;
	height: 100%;
	background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
	transition: transform 0.5s ease;
}

.action-btn:hover::before {
	transform: translateX(200%);
}

.error-decorations {
	position: absolute;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	pointer-events: none;
	z-index: 1;
}

.deco-line {
	position: absolute;
	background: linear-gradient(90deg, transparent, #dc2626, transparent);
	height: 1px;
	animation: deco-pulse 4s ease-in-out infinite;
}

.deco-line-1 {
	top: 20%;
	left: 10%;
	right: 10%;
	animation-delay: 0s;
}

.deco-line-2 {
	top: 60%;
	left: 20%;
	right: 20%;
	animation-delay: 1.5s;
}

.deco-line-3 {
	top: 80%;
	left: 15%;
	right: 15%;
	animation-delay: 3s;
}

@keyframes glow {
	0% {
		text-shadow: 0 0 10px #06b6d4, 0 0 20px #06b6d4;
	}
	100% {
		text-shadow: 0 0 15px #06b6d4, 0 0 25px #06b6d4, 0 0 35px #06b6d4;
	}
}

@keyframes pulse-glow {
	0%, 100% {
		filter: drop-shadow(0 0 20px #dc2626);
	}
	50% {
		filter: drop-shadow(0 0 30px #dc2626) drop-shadow(0 0 40px #dc2626);
	}
}

@keyframes flicker {
	0%, 100% { opacity: 1; }
	2% { opacity: 0.8; }
	4% { opacity: 1; }
	8% { opacity: 0.7; }
	10% { opacity: 1; }
	15% { opacity: 0.9; }
	20% { opacity: 1; }
}

@keyframes scan-line {
	0% { transform: translateX(-100%); }
	100% { transform: translateX(100vw); }
}

@keyframes grid-drift {
	0% { transform: translate(0, 0) rotate(0deg); }
	100% { transform: translate(60px, 60px) rotate(1deg); }
}

@keyframes deco-pulse {
	0%, 100% { opacity: 0; }
	50% { opacity: 0.6; }
}

/* Responsive design */
@media (max-width: 768px) {
	.error-container {
		padding: 1rem;
	}

	.error-display {
		padding: 2rem 1rem;
	}

	.error-title {
		font-size: 2rem;
	}

	.error-description {
		font-size: 1rem;
	}

	.error-actions {
		flex-direction: column;
		align-items: stretch;
	}

	.action-btn {
		padding: 1rem;
		font-size: 0.9rem;
	}
}

@media (max-width: 480px) {
	.error-icon {
		font-size: 3rem;
	}

	.error-title {
		font-size: 1.5rem;
	}

	.error-code {
		font-size: 1.2rem;
	}
}
</style>