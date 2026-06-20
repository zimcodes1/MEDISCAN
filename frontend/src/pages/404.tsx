import { ArrowLeft } from "lucide-react";

function LostPage() {
    const handleClick = ()=>{
        const prevUrl = sessionStorage.getItem('lastPage');
		if (prevUrl){
			let myHostName = "localhost"
			let prevHostName = new URL(prevUrl).hostname
			console.log(prevHostName)
			if (prevHostName == myHostName){
				window.history.back()
			}
			window.location.replace("/dashboard")
		}
		window.location.replace("/dashboard")
    }
	return (
		<div className="w-full h-screen flex justify-center items-center bg-brand-bg">
			<span className="flex flex-col">
				<h1 className="text-brand-text text-lg sm:text-3xl font-bold">
					404 | <b className="text-brand-text-muted">Page Not Found</b>
				</h1>
				<button onClick={handleClick} className="w-fit text-brand-bg bg-linear-to-r from-brand-primary to-brand-secondary p-3 px-10 rounded-2xl mt-5 mx-auto">
					<ArrowLeft  className="inline"/>
					Back
				</button>
			</span>
		</div>
	);
}

export default LostPage;
