import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { ThemeProvider, useTheme } from "../contexts/ThemeContext";
import ThemeToggle from "../components/ThemeToggle";

describe("ThemeContext and ThemeToggle", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove("dark");
  });

  it("initializes with dark theme if specified in localStorage", () => {
    localStorage.setItem("ai-club-theme", "dark");

    const TestComponent = () => {
      const { theme } = useTheme();
      return <div data-testid="current-theme">{theme}</div>;
    };

    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    expect(screen.getByTestId("current-theme").textContent).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("initializes with light theme if specified in localStorage", () => {
    localStorage.setItem("ai-club-theme", "light");

    const TestComponent = () => {
      const { theme } = useTheme();
      return <div data-testid="current-theme">{theme}</div>;
    };

    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    expect(screen.getByTestId("current-theme").textContent).toBe("light");
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("toggles theme and updates localStorage and document root when button is clicked", () => {
    localStorage.setItem("ai-club-theme", "dark");

    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>
    );

    const toggleButton = screen.getByRole("button", { name: /switch to light mode/i });
    expect(toggleButton).toBeInTheDocument();
    expect(document.documentElement.classList.contains("dark")).toBe(true);

    // Click to switch to light mode
    act(() => {
      fireEvent.click(toggleButton);
    });

    expect(localStorage.getItem("ai-club-theme")).toBe("light");
    expect(document.documentElement.classList.contains("dark")).toBe(false);

    // Now button should say 'Switch to dark mode'
    const switchDarkButton = screen.getByRole("button", { name: /switch to dark mode/i });
    expect(switchDarkButton).toBeInTheDocument();

    // Click to switch back to dark mode
    act(() => {
      fireEvent.click(switchDarkButton);
    });

    expect(localStorage.getItem("ai-club-theme")).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("has accessible attributes and focus styling", () => {
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>
    );

    const button = screen.getByRole("button");
    expect(button).toHaveAttribute("type", "button");
    expect(button).toHaveAttribute("aria-label");
    expect(button.getAttribute("aria-label")).toBeTruthy();
  });
});
