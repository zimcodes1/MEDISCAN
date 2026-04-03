export default function Logo({size = 40}: {size?: number}) {
	return (
		<svg
			width={size}
			height={size}
			viewBox="0 0 100 100"
			xmlns="http://www.w3.org/2000/svg"
		>
			<rect width="100" height="100" rx="20" ry="20" fill="#87CEFA" />

			<path
				d="M 25 50 H 42 L 50 30 L 58 70 L 66 50 H 83"
				stroke="black"
				stroke-width="4"
				fill="none"
				stroke-linecap="round"
				stroke-linejoin="round"
			/>
		</svg>
	);
}
