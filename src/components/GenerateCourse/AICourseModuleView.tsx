import { ChevronLeft, ChevronRight, Loader2Icon, LockIcon } from 'lucide-react';
import { cn } from '../../lib/classname';
import { useEffect, useState } from 'react';
import { isLoggedIn, removeAuthToken } from '../../lib/jwt';
import { readAICourseLessonStream } from '../../helper/read-stream';
import { markdownToHtml } from '../../lib/markdown';

type AICourseModuleViewProps = {
  courseSlug: string;

  activeModuleIndex: number;
  totalModules: number;
  currentModuleTitle: string;
  activeLessonIndex: number;
  totalLessons: number;
  currentLessonTitle: string;

  onGoToPrevLesson: () => void;
  onGoToNextLesson: () => void;
};

export function AICourseModuleView(props: AICourseModuleViewProps) {
  const {
    courseSlug,

    activeModuleIndex,
    totalModules,
    currentModuleTitle,
    activeLessonIndex,
    totalLessons,
    currentLessonTitle,

    onGoToPrevLesson,
    onGoToNextLesson,
  } = props;

  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');

  const [lessonHtml, setLessonHtml] = useState('');

  const generateAiCourseContent = async () => {
    setIsLoading(true);
    setError('');

    if (!isLoggedIn()) {
      setIsLoading(false);
      setError('Please login to generate course content');
      return;
    }

    if (!currentModuleTitle || !currentLessonTitle) {
      setIsLoading(false);
      setError('Invalid module title or lesson title');
      return;
    }

    const response = await fetch(
      `${import.meta.env.PUBLIC_API_URL}/v1-generate-ai-course-lesson/${courseSlug}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          moduleTitle: currentModuleTitle,
          lessonTitle: currentLessonTitle,
          modulePosition: activeModuleIndex,
          lessonPosition: activeLessonIndex,
          totalLessonsInModule: totalLessons,
        }),
      },
    );

    if (!response.ok) {
      const data = await response.json();

      setError(data?.message || 'Something went wrong');
      setIsLoading(false);

      // Logout user if token is invalid
      if (data.status === 401) {
        removeAuthToken();
        window.location.reload();
      }
    }
    const reader = response.body?.getReader();

    if (!reader) {
      setIsLoading(false);
      setError('Something went wrong');
      return;
    }

    setIsLoading(false);
    setIsGenerating(true);
    await readAICourseLessonStream(reader, {
      onStream: async (result) => {
        setLessonHtml(markdownToHtml(result, false));
      },
      onStreamEnd: () => {
        setIsGenerating(false);
      },
    });
  };

  useEffect(() => {
    generateAiCourseContent();
  }, [currentModuleTitle, currentLessonTitle]);

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-sm text-gray-500">
            Module {activeModuleIndex + 1} of {totalModules}
          </div>
          <h2 className="text-2xl font-bold">
            {currentModuleTitle?.replace(/^Module\s*?\d+[\.:]\s*/, '') ||
              'Loading...'}
          </h2>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div className="text-sm text-gray-500">
            Lesson {activeLessonIndex + 1} of {totalLessons}
          </div>
        </div>

        <div className="mb-6 flex items-center justify-between gap-2">
          <h3 className="text-xl font-semibold">
            {currentLessonTitle?.replace(/^Lesson\s*?\d+[\.:]\s*/, '')}
          </h3>

          {(isGenerating || isLoading) && (
            <div className="flex items-center justify-center">
              <Loader2Icon size={24} className="animate-spin text-gray-400" />
            </div>
          )}
        </div>

        {!error && isLoggedIn() && (
          <div
            className="prose max-w-none"
            dangerouslySetInnerHTML={{ __html: lessonHtml }}
          />
        )}

        {error && isLoggedIn() && (
          <div className="mt-8 flex items-center justify-center">
            <p className="text-red-500">{error}</p>
          </div>
        )}

        {!isLoggedIn() && (
          <div className="mt-8 flex flex-col items-center justify-center gap-4 rounded-lg border border-gray-200 p-8">
            <LockIcon className="size-10 stroke-[2.5] text-gray-400" />
            <p className="text-sm text-gray-500">
              Please login to generate course content
            </p>
          </div>
        )}

        <div className="mt-8 flex items-center justify-between">
          <button
            onClick={onGoToPrevLesson}
            disabled={activeModuleIndex === 0 && activeLessonIndex === 0}
            className={cn(
              'flex items-center rounded-md px-4 py-2',
              activeModuleIndex === 0 && activeLessonIndex === 0
                ? 'cursor-not-allowed text-gray-400'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200',
            )}
          >
            <ChevronLeft size={16} className="mr-2" />
            Previous Lesson
          </button>

          <button
            onClick={onGoToNextLesson}
            disabled={
              activeModuleIndex === totalModules - 1 &&
              activeLessonIndex === totalLessons - 1
            }
            className={cn(
              'flex items-center rounded-md px-4 py-2',
              activeModuleIndex === totalModules - 1 &&
                activeLessonIndex === totalLessons - 1
                ? 'cursor-not-allowed text-gray-400'
                : 'bg-gray-800 text-white hover:bg-gray-700',
            )}
          >
            Next Lesson
            <ChevronRight size={16} className="ml-2" />
          </button>
        </div>
      </div>
    </div>
  );
}
