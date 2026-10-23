module tb;
reg sel;
  reg [3:0] a, b;
  wire [3:0] y;
  mux2 dut(.sel(sel), .a(a), .b(b), .y(y));
  initial begin
    sel = 0; a = 4'h1; b = 4'h2; #1;
    if (y !== 4'h1) begin $display("FAIL sel0 %h", y); $finish; end
    sel = 1; #1;
    if (y !== 4'h2) begin $display("FAIL sel1 %h", y); $finish; end
    $display("PASS mux");
    $finish;
  end
endmodule
