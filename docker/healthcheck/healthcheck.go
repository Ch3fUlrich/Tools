package main

import (
	"flag"
	"fmt"
	"net/http"
	"os"
	"time"
)

func main() {
	url := flag.String("url", "http://localhost:3001/", "URL to probe")
	timeout := flag.Int("timeout", 3, "timeout seconds")
	flag.Parse()

	client := http.Client{Timeout: time.Duration(*timeout) * time.Second}
	resp, err := client.Get(*url)
	if err != nil {
		fmt.Fprintf(os.Stderr, "healthcheck error: %v\n", err)
		os.Exit(1)
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 200 && resp.StatusCode < 400 {
		fmt.Printf("OK %d\n", resp.StatusCode)
		os.Exit(0)
	}
	fmt.Fprintf(os.Stderr, "non-ok status: %d\n", resp.StatusCode)
	os.Exit(2)
}
