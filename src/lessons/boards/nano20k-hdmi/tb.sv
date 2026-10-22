module tb;
  reg clk = 0;
  always #5 clk = ~clk;
reg rst_n;
  wire [3:0] x;
  wire hsync;
  hsync_gen dut(.clk(clk), .rst_n(rst_n), .x(x), .hsync(hsync));
  initial begin
    rst_n = 0;
    repeat (2) @(posedge clk);
    @(negedge clk);
    rst_n = 1;
    #1;
    if (x !== 0 || hsync !== 1'b1) begin
      $display("FAIL at x=%0d hsync=%b", x, hsync);
      $finish;
    end
    repeat (3) @(posedge clk);
    #1;
    if (hsync === 1'b0) $display("PASS hsync fell after the pulse");
    else $display("FAIL hsync still %b at x=%0d", hsync, x);
    $finish;
  end
endmodule
