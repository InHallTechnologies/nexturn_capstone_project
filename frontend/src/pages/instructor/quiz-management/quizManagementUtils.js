export const createEmptyQuiz = () => ({
    title: "",
    description: "",
    time_limit_minutes: 15,
    max_attempts: 2,
  });
  
  export const createEmptyQuestion = (order = 1) => ({
    question: "",
    type: "mcq",
    options: ["", "", "", ""],
    correct_answers: [],
    order,
  });
  
  export const buttonClass =
    "rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50";
  
  export const inputClass =
    "w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100";
  
  export function getErrorMessage(error, fallback) {
    return (
      error.response?.data?.error ||
      error.response?.data?.message ||
      fallback
    );
  }