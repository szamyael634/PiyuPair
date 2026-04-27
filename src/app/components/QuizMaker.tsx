import { useState } from "react";
import { Navigation } from "./Navigation";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Plus, Trash2, Save } from "lucide-react";
import { toast } from "sonner";

interface Question {
  id: string;
  type: "multiple-choice" | "true-false" | "short-answer";
  question: string;
  options?: string[];
  correctAnswer: string;
}

export function QuizMaker() {
  const [quizTitle, setQuizTitle] = useState("");
  const [quizSubject, setQuizSubject] = useState("");
  const [questions, setQuestions] = useState<Question[]>([]);

  const addQuestion = () => {
    const newQuestion: Question = {
      id: Date.now().toString(),
      type: "multiple-choice",
      question: "",
      options: ["", "", "", ""],
      correctAnswer: "",
    };
    setQuestions([...questions, newQuestion]);
  };

  const updateQuestion = (id: string, field: keyof Question, value: any) => {
    setQuestions(
      questions.map((q) => (q.id === id ? { ...q, [field]: value } : q))
    );
  };

  const updateOption = (questionId: string, optionIndex: number, value: string) => {
    setQuestions(
      questions.map((q) => {
        if (q.id === questionId && q.options) {
          const newOptions = [...q.options];
          newOptions[optionIndex] = value;
          return { ...q, options: newOptions };
        }
        return q;
      })
    );
  };

  const deleteQuestion = (id: string) => {
    setQuestions(questions.filter((q) => q.id !== id));
  };

  const saveQuiz = () => {
    if (!quizTitle || !quizSubject || questions.length === 0) {
      toast.error("Please fill in all fields and add at least one question");
      return;
    }
    toast.success("Quiz saved successfully!");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Quiz Maker</h1>
          <p className="text-gray-600 mt-1">Create quizzes and tests for your students</p>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Quiz Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="quizTitle">Quiz Title</Label>
              <Input
                id="quizTitle"
                placeholder="e.g., Calculus Midterm Review"
                value={quizTitle}
                onChange={(e) => setQuizTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="quizSubject">Subject</Label>
              <Select value={quizSubject} onValueChange={setQuizSubject}>
                <SelectTrigger>
                  <SelectValue placeholder="Select subject" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mathematics">Mathematics</SelectItem>
                  <SelectItem value="physics">Physics</SelectItem>
                  <SelectItem value="chemistry">Chemistry</SelectItem>
                  <SelectItem value="computer-science">Computer Science</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {questions.map((question, index) => (
          <Card key={question.id} className="mb-4">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Question {index + 1}</CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => deleteQuestion(question.id)}
                >
                  <Trash2 className="h-4 w-4 text-red-600" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Question Type</Label>
                <Select
                  value={question.type}
                  onValueChange={(value: any) => updateQuestion(question.id, "type", value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="multiple-choice">Multiple Choice</SelectItem>
                    <SelectItem value="true-false">True/False</SelectItem>
                    <SelectItem value="short-answer">Short Answer</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Question</Label>
                <Textarea
                  placeholder="Enter your question..."
                  value={question.question}
                  onChange={(e) => updateQuestion(question.id, "question", e.target.value)}
                  rows={2}
                />
              </div>

              {question.type === "multiple-choice" && question.options && (
                <div className="space-y-2">
                  <Label>Options</Label>
                  {question.options.map((option, i) => (
                    <Input
                      key={i}
                      placeholder={`Option ${i + 1}`}
                      value={option}
                      onChange={(e) => updateOption(question.id, i, e.target.value)}
                    />
                  ))}
                </div>
              )}

              <div className="space-y-2">
                <Label>Correct Answer</Label>
                {question.type === "multiple-choice" ? (
                  <Select
                    value={question.correctAnswer}
                    onValueChange={(value) => updateQuestion(question.id, "correctAnswer", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select correct answer" />
                    </SelectTrigger>
                    <SelectContent>
                      {question.options?.map((option, i) => (
                        <SelectItem key={i} value={option}>
                          Option {i + 1}: {option || "(empty)"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : question.type === "true-false" ? (
                  <Select
                    value={question.correctAnswer}
                    onValueChange={(value) => updateQuestion(question.id, "correctAnswer", value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">True</SelectItem>
                      <SelectItem value="false">False</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    placeholder="Enter correct answer"
                    value={question.correctAnswer}
                    onChange={(e) => updateQuestion(question.id, "correctAnswer", e.target.value)}
                  />
                )}
              </div>
            </CardContent>
          </Card>
        ))}

        <div className="flex gap-4">
          <Button onClick={addQuestion} variant="outline" className="flex-1">
            <Plus className="h-4 w-4 mr-2" />
            Add Question
          </Button>
          <Button onClick={saveQuiz} className="flex-1">
            <Save className="h-4 w-4 mr-2" />
            Save Quiz
          </Button>
        </div>
      </div>
    </div>
  );
}
