import Link from "next/link";

export default function NotFound() {
  return (
    <div className="py-16 text-center">
      <p className="text-sm text-gray-600">공고를 찾을 수 없어요.</p>
      <Link href="/" replace className="mt-3 inline-block text-sm text-blue-700 underline">
        추천 피드로 돌아가기
      </Link>
    </div>
  );
}
